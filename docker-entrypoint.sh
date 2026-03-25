#!/bin/sh
set -e

echo "Waiting for database..."
# Wait for PostgreSQL to be ready
for i in $(seq 1 30); do
  if node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => { pool.end(); process.exit(1); });
  " 2>/dev/null; then
    echo "Database is ready."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "Database not ready after 30 seconds, starting anyway..."
    break
  fi
  sleep 1
done

# Apply schema (creates tables if they don't exist)
echo "Applying database schema..."
npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss 2>/dev/null || echo "Schema push skipped (prisma config issue — tables may need manual setup)"

echo "Starting Repan..."
exec "$@"
