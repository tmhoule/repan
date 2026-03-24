#!/bin/bash
# Migrate an existing Repan database to support multi-team features.
# Run this once on machines that had a previous version installed.
#
# Usage: ./scripts/migrate-to-teams.sh
#
# Requires: Docker running with the repan-db-1 container

set -e

CONTAINER="repan-db-1"
DB_USER="repan"
DB_NAME="repan"

echo "=== Repan: Migrate to Teams ==="
echo ""

# Check Docker is running
if ! docker ps --filter name=$CONTAINER --format '{{.Names}}' | grep -q $CONTAINER; then
  echo "Error: Container $CONTAINER is not running."
  echo "Start it with: docker compose up -d"
  exit 1
fi

echo "1. Adding schema changes..."
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS team_memberships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  role TEXT NOT NULL DEFAULT 'member',
  UNIQUE(user_id, team_id)
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id TEXT REFERENCES teams(id);
"

echo "2. Creating default team..."
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO teams (id, name)
SELECT gen_random_uuid(), 'Default Team'
WHERE NOT EXISTS (SELECT 1 FROM teams);
"

echo "3. Assigning tasks to default team..."
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
UPDATE tasks SET team_id = (SELECT id FROM teams LIMIT 1) WHERE team_id IS NULL;
"

echo "4. Promoting first manager to super admin..."
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
UPDATE users SET is_super_admin = true
WHERE id = (SELECT id FROM users WHERE role = 'manager' AND is_active = true LIMIT 1)
  AND is_super_admin = false;
"

echo "5. Adding all users to default team..."
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO team_memberships (id, user_id, team_id, role)
SELECT gen_random_uuid(), u.id, (SELECT id FROM teams LIMIT 1),
  CASE WHEN u.role = 'manager' THEN 'manager' ELSE 'member' END::\"TeamRole\"
FROM users u WHERE u.is_active = true
ON CONFLICT (user_id, team_id) DO NOTHING;
"

echo ""
echo "=== Migration complete ==="
echo "Restart the app: docker compose up --build"
