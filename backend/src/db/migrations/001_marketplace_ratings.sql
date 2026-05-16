-- Migration 001: marketplace templates + ratings
-- Run once against your existing database:
--   psql $DATABASE_URL -f backend/src/db/migrations/001_marketplace_ratings.sql

CREATE TABLE IF NOT EXISTS marketplace_templates (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  description      TEXT         NOT NULL DEFAULT '',
  category         VARCHAR(100) NOT NULL DEFAULT 'General',
  tags             JSONB        NOT NULL DEFAULT '[]',
  graph            JSONB        NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  setup_guide      JSONB        NOT NULL DEFAULT '[]',
  required_credentials JSONB   NOT NULL DEFAULT '[]',
  published_by     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_by_name VARCHAR(255) NOT NULL DEFAULT 'Unknown',
  node_count       INTEGER      NOT NULL DEFAULT 0,
  edge_count       INTEGER      NOT NULL DEFAULT 0,
  install_count    INTEGER      NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

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
