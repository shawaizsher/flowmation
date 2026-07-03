#!/bin/sh
# Initialize database schema before the app starts.
# Supports both local Docker postgres and external cloud databases (Supabase, Render, Railway, Neon, etc.)

set -e

echo "Waiting for PostgreSQL to be ready..."

# Parse host from DATABASE_URL (postgresql://user:pass@host:port/db)
DB_HOST=""
DB_PORT="5432"
if [ -n "$DATABASE_URL" ]; then
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
  PARSED_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+)/.*|\1|')
  if echo "$PARSED_PORT" | grep -qE '^[0-9]+$'; then
    DB_PORT="$PARSED_PORT"
  fi
fi
DB_HOST="${DB_HOST:-postgres}"

# For external cloud databases skip the nc check — they are always reachable
# before our container starts (they're not Docker siblings).
IS_EXTERNAL=0
if echo "$DB_HOST" | grep -qE '\.supabase\.(co|com)|amazonaws\.com|render\.com|railway\.app|neon\.tech|cockroachlabs\.com|planetscale\.com'; then
  IS_EXTERNAL=1
fi
if [ "$DB_HOST" != "postgres" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
  IS_EXTERNAL=1
fi

if [ "$IS_EXTERNAL" = "1" ]; then
  echo "External cloud database detected (host: $DB_HOST) — skipping nc check."
else
  max_attempts=30
  attempt=0
  while [ $attempt -lt $max_attempts ]; do
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
      echo "PostgreSQL is ready!"
      break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
    sleep 1
  done

  if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: PostgreSQL at $DB_HOST:$DB_PORT failed to start after $max_attempts attempts."
    exit 1
  fi
fi

echo "Initializing database schema..."

# Run the SQL initialization script.
# For external DBs use DATABASE_URL directly; for local Docker use env vars.
if [ "$IS_EXTERNAL" = "1" ] && [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f /app/src/db/init.sql 2>&1 || {
    echo "Note: Schema may already be initialized (this is usually safe to ignore)."
  }
else
  export PGPASSWORD=${DB_PASSWORD:-fluxion_password}
  psql -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-fluxion_user}" -d "${DB_NAME:-fluxion_db}" -f /app/src/db/init.sql 2>&1 || {
    echo "Note: Schema may already be initialized (this is usually safe to ignore)."
  }
  unset PGPASSWORD
fi

echo "Database ready!"
exec "$@"
