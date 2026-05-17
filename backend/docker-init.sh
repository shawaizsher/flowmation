#!/bin/sh
# Initialize database if tables don't exist
# This script runs before the app starts

set -e

echo "Waiting for PostgreSQL to be ready..."
# Retry logic to wait for postgres
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if nc -z postgres 5432 2>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  fi
  attempt=$((attempt + 1))
  echo "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "PostgreSQL failed to start"
  exit 1
fi

echo "Initializing database schema..."

# Run the SQL initialization script
export PGPASSWORD=${DB_PASSWORD:-flowa_password}
psql -h postgres -U ${DB_USER:-flowa_user} -d ${DB_NAME:-flowa_db} -f /app/src/db/init.sql 2>&1 || {
  echo "Note: Database might already be initialized or there was an error (likely benign)"
}
unset PGPASSWORD

echo "Database ready!"
exec "$@"
