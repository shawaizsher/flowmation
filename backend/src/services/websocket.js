const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { getRedis, getRedisSub } = require('../db/redis');
const logger = require('../utils/logger');

const WS_EVENTS_CHANNEL = 'ws:execution-events';

// Color palette for collaborators
const COLORS = ['#F63049', '#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();          // socketId → { ws, userId, userName, workspaceId }
    this.workspaceClients = new Map(); // workspaceId → Set<socketId>
    this.workflowPresence = new Map(); // workflowId → Map<userId, { socketId, userName, color, cursor, selectedNode }>
    this.colorIndex = 0;
  }

  init(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: async (info, done) => {
        try {
          const url = new URL(info.req.url, 'http://localhost');
          const token = url.searchParams.get('token');
          if (!token) return done(false, 401, 'Token required');

          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          info.req.userId = decoded.userId;
          done(true);
        } catch (err) {
          done(false, 401, 'Invalid token');
        }
      }
    });

    this.wss.on('connection', async (ws, req) => {
      const socketId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userId = req.userId;

      // Fetch user info
      let userName = 'Unknown';
      try {
        const result = await query('SELECT name FROM users WHERE id = $1', [userId]);
        if (result.rows.length > 0) userName = result.rows[0].name;
      } catch (e) { /* fallback to Unknown */ }

      const color = COLORS[this.colorIndex % COLORS.length];
      this.colorIndex++;

      this.clients.set(socketId, { ws, userId, userName, workspaceId: null, color });

      // Send connected message
      this.send(ws, { type: 'connected', userId, color });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(socketId, message);
        } catch (err) {
          logger.error('WebSocket message parse error:', err);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(socketId);
      });

      ws.on('error', (err) => {
        logger.error(`WebSocket error for ${socketId}:`, err.message);
      });

      logger.info(`WebSocket connected: ${socketId} (user: ${userName})`);
    });

    logger.info('WebSocket server initialized');
  }

  handleMessage(socketId, message) {
    const client = this.clients.get(socketId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(socketId, client, message);
        break;
      case 'join_workflow':
        this.handleJoinWorkflow(socketId, client, message);
        break;
      case 'leave_workflow':
        this.handleLeaveWorkflow(socketId, client, message);
        break;
      case 'cursor_move':
        this.handleCursorMove(socketId, client, message);
        break;
      case 'node_select':
        this.handleNodeSelect(socketId, client, message);
        break;
      case 'graph_change':
        this.handleGraphChange(socketId, client, message);
        break;
      default:
        logger.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }

  handleSubscribe(socketId, client, message) {
    const { workspaceId } = message;
    client.workspaceId = workspaceId;

    if (!this.workspaceClients.has(workspaceId)) {
      this.workspaceClients.set(workspaceId, new Set());
    }
    this.workspaceClients.get(workspaceId).add(socketId);

    this.send(client.ws, { type: 'subscribed', workspaceId });
  }

  async handleJoinWorkflow(socketId, client, message) {
    const { workflowId } = message;

    if (!this.workflowPresence.has(workflowId)) {
      this.workflowPresence.set(workflowId, new Map());
    }

    const presence = this.workflowPresence.get(workflowId);

    // Add to presence
    presence.set(client.userId, {
      socketId,
      userName: client.userName,
      color: client.color,
      cursor: null,
      selectedNode: null
    });

    // Update DB
    try {
      await query(
        `MERGE INTO workflow_editors AS target
         USING (SELECT $1 AS workflow_id, $2 AS user_id, $3 AS socket_id) AS source
         ON target.workflow_id = source.workflow_id AND target.user_id = source.user_id
         WHEN MATCHED THEN UPDATE SET socket_id = source.socket_id, last_seen = GETDATE()
         WHEN NOT MATCHED THEN INSERT (workflow_id, user_id, socket_id, last_seen) 
         VALUES (source.workflow_id, source.user_id, source.socket_id, GETDATE());`,
        [workflowId, client.userId, socketId]
      );
    } catch (e) { /* non-critical */ }

    // Send presence init to the joiner (who's already there)
    const collaborators = [];
    for (const [uid, info] of presence) {
      if (uid !== client.userId) {
        collaborators.push({
          userId: uid,
          userName: info.userName,
          color: info.color,
          cursor: info.cursor,
          selectedNode: info.selectedNode
        });
      }
    }

    this.send(client.ws, {
      type: 'presence_init',
      workflowId,
      collaborators
    });

    // Broadcast user_joined to everyone else
    this.broadcastToWorkflow(workflowId, {
      type: 'user_joined',
      workflowId,
      userId: client.userId,
      userName: client.userName,
      color: client.color
    }, client.userId);
  }

  async handleLeaveWorkflow(socketId, client, message) {
    const { workflowId } = message;
    this.removeFromWorkflow(workflowId, client.userId, socketId);
  }

  handleCursorMove(socketId, client, message) {
    const { workflowId, position } = message;
    const presence = this.workflowPresence.get(workflowId);
    if (presence && presence.has(client.userId)) {
      presence.get(client.userId).cursor = position;
    }

    this.broadcastToWorkflow(workflowId, {
      type: 'cursor_move',
      workflowId,
      userId: client.userId,
      userName: client.userName,
      color: client.color,
      position
    }, client.userId);
  }

  handleNodeSelect(socketId, client, message) {
    const { workflowId, nodeId } = message;
    const presence = this.workflowPresence.get(workflowId);
    if (presence && presence.has(client.userId)) {
      presence.get(client.userId).selectedNode = nodeId;
    }

    this.broadcastToWorkflow(workflowId, {
      type: 'node_select',
      workflowId,
      userId: client.userId,
      userName: client.userName,
      color: client.color,
      nodeId
    }, client.userId);
  }

  handleGraphChange(socketId, client, message) {
    const { workflowId, change } = message;

    this.broadcastToWorkflow(workflowId, {
      type: 'graph_change',
      workflowId,
      userId: client.userId,
      userName: client.userName,
      change
    }, client.userId);
  }

  async handleDisconnect(socketId) {
    const client = this.clients.get(socketId);
    if (!client) return;

    // Remove from workspace clients
    if (client.workspaceId) {
      const wsClients = this.workspaceClients.get(client.workspaceId);
      if (wsClients) wsClients.delete(socketId);
    }

    // Remove from all workflow presences
    for (const [workflowId, presence] of this.workflowPresence) {
      if (presence.has(client.userId)) {
        const info = presence.get(client.userId);
        if (info.socketId === socketId) {
          this.removeFromWorkflow(workflowId, client.userId, socketId);
        }
      }
    }

    this.clients.delete(socketId);
    logger.info(`WebSocket disconnected: ${socketId} (user: ${client.userName})`);
  }

  async removeFromWorkflow(workflowId, userId, socketId) {
    const presence = this.workflowPresence.get(workflowId);
    if (presence) {
      presence.delete(userId);
      if (presence.size === 0) {
        this.workflowPresence.delete(workflowId);
      }
    }

    // Remove from DB
    try {
      await query(
        'DELETE FROM workflow_editors WHERE workflow_id = $1 AND user_id = $2',
        [workflowId, userId]
      );
    } catch (e) { /* non-critical */ }

    // Broadcast user_left
    this.broadcastToWorkflow(workflowId, {
      type: 'user_left',
      workflowId,
      userId
    });
  }

  // ── Broadcast helpers ──

  send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcastToWorkflow(workflowId, message, excludeUserId = null) {
    const presence = this.workflowPresence.get(workflowId);
    if (!presence) return;

    for (const [userId, info] of presence) {
      if (userId === excludeUserId) continue;
      const client = this.clients.get(info.socketId);
      if (client) {
        this.send(client.ws, message);
      }
    }
  }

  broadcastToWorkspace(workspaceId, message) {
    // If running in worker process (no WebSocket server), relay via Redis pub/sub
    if (!this.wss) {
      try {
        const redis = getRedis();
        redis.publish(WS_EVENTS_CHANNEL, JSON.stringify({ workspaceId, message }));
      } catch (err) {
        logger.error('Failed to publish execution event to Redis:', err.message);
      }
      return;
    }

    const socketIds = this.workspaceClients.get(workspaceId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
      const client = this.clients.get(socketId);
      if (client) {
        this.send(client.ws, message);
      }
    }
  }

  /** Subscribe to Redis channel and relay execution events to WebSocket clients (main server only) */
  initRedisSubscriber() {
    const sub = getRedisSub();
    sub.subscribe(WS_EVENTS_CHANNEL, (err) => {
      if (err) {
        logger.error('Failed to subscribe to execution events channel:', err.message);
        return;
      }
      logger.info('Subscribed to Redis execution events channel');
    });

    sub.on('message', (channel, data) => {
      if (channel !== WS_EVENTS_CHANNEL) return;
      try {
        const { workspaceId, message } = JSON.parse(data);
        // Broadcast directly to WebSocket clients (this.wss exists in main server)
        const socketIds = this.workspaceClients.get(workspaceId);
        if (!socketIds) return;

        for (const socketId of socketIds) {
          const client = this.clients.get(socketId);
          if (client) {
            this.send(client.ws, message);
          }
        }
      } catch (err) {
        logger.error('Failed to process Redis execution event:', err.message);
      }
    });
  }
}

// Singleton
const wsManager = new WebSocketManager();

function initWebSocket(server) {
  wsManager.init(server);
  return wsManager;
}

function broadcast(workflowId, message) {
  wsManager.broadcastToWorkflow(workflowId, message);
}

function getWSManager() {
  return wsManager;
}

module.exports = { initWebSocket, broadcast, getWSManager };
