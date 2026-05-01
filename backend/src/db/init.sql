-- ═══════════════════════════════════════════════════════
-- Flowa – Database Schema & Seed Data (SQL Server)
-- ═══════════════════════════════════════════════════════

-- Create database if running this manually
-- CREATE DATABASE flowa;
-- GO
-- USE flowa;
-- GO

-- ── Users ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  email NVARCHAR(255) UNIQUE NOT NULL,
  password_hash NVARCHAR(255) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BIT DEFAULT 1,
  email_verified BIT DEFAULT 0,
  created_at DATETIMEOFFSET DEFAULT GETDATE(),
  updated_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ── Email Verification Tokens ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='email_verification_tokens' AND xtype='U')
CREATE TABLE email_verification_tokens (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
  token NVARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIMEOFFSET NOT NULL,
  created_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ── Workspaces ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workspaces' AND xtype='U')
CREATE TABLE workspaces (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  slug NVARCHAR(255) UNIQUE NOT NULL,
  owner_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
  settings NVARCHAR(MAX) DEFAULT '{}',
  created_at DATETIMEOFFSET DEFAULT GETDATE(),
  updated_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ── Workspace Members ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workspace_members' AND xtype='U')
CREATE TABLE workspace_members (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workspace_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
  role NVARCHAR(20) DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at DATETIMEOFFSET DEFAULT GETDATE(),
  UNIQUE(workspace_id, user_id)
);
GO

-- ── Workflows ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workflows' AND xtype='U')
CREATE TABLE workflows (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workspace_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) DEFAULT '',
  graph NVARCHAR(MAX) DEFAULT '{"nodes":[],"edges":[]}',
  status NVARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')),
  tags NVARCHAR(MAX) DEFAULT '[]',
  version INT DEFAULT 1,
  created_by UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
  created_at DATETIMEOFFSET DEFAULT GETDATE(),
  updated_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ── Workflow Versions ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workflow_versions' AND xtype='U')
CREATE TABLE workflow_versions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workflow_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workflows(id) ON DELETE CASCADE,
  version INT NOT NULL,
  graph NVARCHAR(MAX) NOT NULL,
  label NVARCHAR(255),
  message NVARCHAR(MAX),
  is_named BIT DEFAULT 0,
  created_by UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
  created_at DATETIMEOFFSET DEFAULT GETDATE(),
  UNIQUE(workflow_id, version)
);
GO

-- ── Workflow Editors (multiplayer presence) ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workflow_editors' AND xtype='U')
CREATE TABLE workflow_editors (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workflow_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
  socket_id NVARCHAR(255),
  last_seen DATETIMEOFFSET DEFAULT GETDATE(),
  UNIQUE(workflow_id, user_id)
);
GO

-- ── Executions ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='executions' AND xtype='U')
CREATE TABLE executions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workflow_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workspaces(id) ON DELETE NO ACTION,
  status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout')),
  trigger_type NVARCHAR(20) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'webhook', 'schedule', 'api')),
  trigger_payload NVARCHAR(MAX) DEFAULT '{}',
  context NVARCHAR(MAX) DEFAULT '{}',
  error NVARCHAR(MAX),
  started_at DATETIMEOFFSET,
  finished_at DATETIMEOFFSET,
  duration_ms INT,
  created_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ── Node Logs ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='node_logs' AND xtype='U')
CREATE TABLE node_logs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  execution_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES executions(id) ON DELETE CASCADE,
  node_id NVARCHAR(255) NOT NULL,
  node_type NVARCHAR(255),
  node_label NVARCHAR(255),
  status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  input NVARCHAR(MAX) DEFAULT '{}',
  output NVARCHAR(MAX) DEFAULT '{}',
  error NVARCHAR(MAX),
  started_at DATETIMEOFFSET,
  finished_at DATETIMEOFFSET,
  duration_ms INT,
  attempt INT DEFAULT 1
);
GO

-- ── Credentials ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='credentials' AND xtype='U')
CREATE TABLE credentials (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workspace_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  name NVARCHAR(255) NOT NULL,
  type NVARCHAR(100) NOT NULL,
  encrypted_data NVARCHAR(MAX) NOT NULL,
  created_by UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
  created_at DATETIMEOFFSET DEFAULT GETDATE(),
  updated_at DATETIMEOFFSET DEFAULT GETDATE(),
  UNIQUE(workspace_id, name)
);
GO

-- ── Webhooks ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='webhooks' AND xtype='U')
CREATE TABLE webhooks (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workflow_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workspaces(id) ON DELETE NO ACTION,
  node_id NVARCHAR(255),
  path NVARCHAR(255) UNIQUE NOT NULL,
  secret_token NVARCHAR(255),
  method NVARCHAR(10) DEFAULT 'ANY',
  is_active BIT DEFAULT 1,
  created_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ── AI Generations ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ai_generations' AND xtype='U')
CREATE TABLE ai_generations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  workspace_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
  type NVARCHAR(50) NOT NULL,
  prompt NVARCHAR(MAX),
  result NVARCHAR(MAX),
  model NVARCHAR(100),
  tokens_used INT DEFAULT 0,
  created_at DATETIMEOFFSET DEFAULT GETDATE()
);
GO

-- ═══════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_workflows_workspace')
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_workflows_status')
CREATE INDEX idx_workflows_status ON workflows(status);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_workflow_versions_workflow')
CREATE INDEX idx_workflow_versions_workflow ON workflow_versions(workflow_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_executions_workflow')
CREATE INDEX idx_executions_workflow ON executions(workflow_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_executions_workspace')
CREATE INDEX idx_executions_workspace ON executions(workspace_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_executions_status')
CREATE INDEX idx_executions_status ON executions(status);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_node_logs_execution')
CREATE INDEX idx_node_logs_execution ON node_logs(execution_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_workspace_members_user')
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_workspace_members_workspace')
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_webhooks_path')
CREATE INDEX idx_webhooks_path ON webhooks(path);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_workflow_editors_workflow')
CREATE INDEX idx_workflow_editors_workflow ON workflow_editors(workflow_id);
GO

-- ═══════════════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════════════

-- Admin user (password: admin123)
IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@flowa.dev')
BEGIN
  INSERT INTO users (id, email, password_hash, name, role, email_verified)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@flowa.dev',
    '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
    'Admin',
    'admin',
    1
  );
END
GO

-- Team users (password for all: admin123)
IF NOT EXISTS (SELECT * FROM users WHERE email = 'sarah@flowa.dev')
BEGIN
  INSERT INTO users (id, email, password_hash, name, role, email_verified)
  VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'sarah@flowa.dev',
    '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
    'Sarah Khan',
    'user',
    1
  );
END
GO

IF NOT EXISTS (SELECT * FROM users WHERE email = 'bilal@flowa.dev')
BEGIN
  INSERT INTO users (id, email, password_hash, name, role, email_verified)
  VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'bilal@flowa.dev',
    '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
    'Bilal Ahmed',
    'user',
    1
  );
END
GO

IF NOT EXISTS (SELECT * FROM users WHERE email = 'aisha@flowa.dev')
BEGIN
  INSERT INTO users (id, email, password_hash, name, role, email_verified)
  VALUES (
    'a0000000-0000-0000-0000-000000000004',
    'aisha@flowa.dev',
    '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
    'Aisha Noor',
    'user',
    1
  );
END
GO

-- Default workspace
IF NOT EXISTS (SELECT * FROM workspaces WHERE slug = 'default')
BEGIN
  INSERT INTO workspaces (id, name, slug, owner_id)
  VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Default Workspace',
    'default',
    'a0000000-0000-0000-0000-000000000001'
  );
END
GO

-- Admin is workspace owner
IF NOT EXISTS (SELECT * FROM workspace_members WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001' AND user_id = 'a0000000-0000-0000-0000-000000000001')
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'owner'
  );
END
GO

-- Team members in default workspace
IF NOT EXISTS (SELECT * FROM workspace_members WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001' AND user_id = 'a0000000-0000-0000-0000-000000000002')
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'admin'
  );
END
GO

IF NOT EXISTS (SELECT * FROM workspace_members WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001' AND user_id = 'a0000000-0000-0000-0000-000000000003')
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'editor'
  );
END
GO

IF NOT EXISTS (SELECT * FROM workspace_members WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001' AND user_id = 'a0000000-0000-0000-0000-000000000004')
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'viewer'
  );
END
GO

-- Sample workflow
IF NOT EXISTS (SELECT * FROM workflows WHERE id = 'c0000000-0000-0000-0000-000000000001')
BEGIN
  INSERT INTO workflows (id, workspace_id, name, description, graph, status, created_by)
  VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Welcome Workflow',
    'A sample workflow to get you started',
    '{"nodes":[{"id":"trigger-1","type":"manualTrigger","position":{"x":100,"y":200},"data":{"label":"Manual Trigger","type":"manualTrigger","config":{}}},{"id":"log-1","type":"consoleLog","position":{"x":400,"y":200},"data":{"label":"Log Output","type":"consoleLog","config":{"message":"Hello from Flowa!"}}}],"edges":[{"id":"e-trigger-1-log-1","source":"trigger-1","target":"log-1"}]}',
    'active',
    'a0000000-0000-0000-0000-000000000001'
  );
END
GO
