-- ═══════════════════════════════════════════════════════
-- Flowa – Database Schema & Seed Data (PostgreSQL)
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ──
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  settings TEXT DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Verification Tokens ──
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workspaces ──
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  settings TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workspace Members ──
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ── Workflows ──
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  graph TEXT DEFAULT '{"nodes":[],"edges":[]}',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')),
  tags TEXT DEFAULT '[]',
  version INT DEFAULT 1,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflow Versions ──
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  version INT NOT NULL,
  graph TEXT NOT NULL,
  label VARCHAR(255),
  message TEXT,
  is_named BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, version)
);

-- ── Workflow Editors (multiplayer presence) ──
CREATE TABLE IF NOT EXISTS workflow_editors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  socket_id VARCHAR(255),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, user_id)
);

-- ── Executions ──
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout')),
  trigger_type VARCHAR(20) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'webhook', 'schedule', 'api')),
  trigger_payload TEXT DEFAULT '{}',
  context TEXT DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Node Logs ──
CREATE TABLE IF NOT EXISTS node_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(255),
  node_label VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  input TEXT DEFAULT '{}',
  output TEXT DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  attempt INT DEFAULT 1
);

-- ── Credentials ──
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  encrypted_data TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- ── Webhooks ──
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE RESTRICT,
  node_id VARCHAR(255),
  path VARCHAR(255) UNIQUE NOT NULL,
  secret_token VARCHAR(255),
  method VARCHAR(10) DEFAULT 'ANY',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI Generations ──
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  type VARCHAR(50) NOT NULL,
  prompt TEXT,
  result TEXT,
  model VARCHAR(100),
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_workspace ON executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_node_logs_execution ON node_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_path ON webhooks(path);
CREATE INDEX IF NOT EXISTS idx_workflow_editors_workflow ON workflow_editors(workflow_id);

-- ── Marketplace templates (user-published) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_templates (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  description          TEXT         NOT NULL DEFAULT '',
  category             VARCHAR(100) NOT NULL DEFAULT 'General',
  tags                 JSONB        NOT NULL DEFAULT '[]',
  graph                JSONB        NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  setup_guide          JSONB        NOT NULL DEFAULT '[]',
  required_credentials JSONB        NOT NULL DEFAULT '[]',
  published_by         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_by_name    VARCHAR(255) NOT NULL DEFAULT 'Unknown',
  node_count           INTEGER      NOT NULL DEFAULT 0,
  edge_count           INTEGER      NOT NULL DEFAULT 0,
  install_count        INTEGER      NOT NULL DEFAULT 0,
  is_active            BOOLEAN      NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Template ratings (1-5 stars, one per user per template) ─────────────────
CREATE TABLE IF NOT EXISTS template_ratings (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT    NOT NULL,
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_ratings_template_id ON template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_published_by ON marketplace_templates(published_by);

-- ═══════════════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════════════

-- Admin user (password: admin123)
INSERT INTO users (id, email, password_hash, name, role, email_verified)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@flowa.dev',
  '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
  'Admin', 'admin', TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, role, email_verified)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'sarah@flowa.dev',
  '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
  'Sarah Khan', 'user', TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, role, email_verified)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'bilal@flowa.dev',
  '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
  'Bilal Ahmed', 'user', TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, role, email_verified)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'aisha@flowa.dev',
  '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy',
  'Aisha Noor', 'user', TRUE
) ON CONFLICT (email) DO NOTHING;

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
INSERT INTO workspaces (id, name, slug, owner_id)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Default Workspace', 'default',
  'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (slug) DO NOTHING;

-- Workspace members
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'admin')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'editor')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'viewer')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

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
INSERT INTO workflows (id, workspace_id, name, description, graph, status, created_by)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Welcome Workflow',
  'A sample workflow to get you started',
  '{"nodes":[{"id":"trigger-1","type":"manualTrigger","position":{"x":100,"y":200},"data":{"label":"Manual Trigger","type":"manualTrigger","config":{}}},{"id":"log-1","type":"consoleLog","position":{"x":400,"y":200},"data":{"label":"Log Output","type":"consoleLog","config":{"message":"Hello from Flowa!"}}}],"edges":[{"id":"e-trigger-1-log-1","source":"trigger-1","target":"log-1"}]}',
  'active',
  'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
