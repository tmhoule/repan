#!/usr/bin/env node
/**
 * Promote a user to super admin.
 *
 * Usage (inside Docker container):
 *   docker compose exec app node src/scripts/make-superadmin.js "Todd Houle"
 *   docker compose exec app node src/scripts/make-superadmin.js "Todd Houle" --set-password Secret123
 *
 * Usage (on host with DATABASE_URL set):
 *   node src/scripts/make-superadmin.js "Todd Houle"
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env if present
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const args = process.argv.slice(2);
const name = args[0];
const pwIdx = args.indexOf('--set-password');
const password = pwIdx !== -1 ? args[pwIdx + 1] : null;

if (!name) {
  console.error('Usage: node src/scripts/make-superadmin.js "User Name" [--set-password <password>]');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Find user (case-insensitive)
    const { rows } = await pool.query(
      'SELECT id, name FROM users WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (rows.length === 0) {
      console.error(`User "${name}" not found.`);
      const all = await pool.query('SELECT name FROM users ORDER BY name');
      console.error('Available users:', all.rows.map(r => r.name).join(', '));
      process.exit(1);
    }

    const user = rows[0];

    if (password) {
      if (password.length < 6) {
        console.error('Password must be at least 6 characters.');
        process.exit(1);
      }
      // Hash with bcryptjs if available, otherwise use built-in crypto
      let hash;
      try {
        const bcrypt = require('bcryptjs');
        hash = await bcrypt.hash(password, 10);
      } catch {
        console.error('bcryptjs not available. Skipping password update.');
        console.error('Run without --set-password, then set password via the admin UI.');
        hash = null;
      }

      if (hash) {
        await pool.query(
          'UPDATE users SET is_super_admin = true, role = $1, password_hash = $2 WHERE id = $3',
          ['manager', hash, user.id]
        );
        console.log(`${user.name} is now a super admin. Password updated.`);
      } else {
        await pool.query(
          'UPDATE users SET is_super_admin = true, role = $1 WHERE id = $2',
          ['manager', user.id]
        );
        console.log(`${user.name} is now a super admin.`);
      }
    } else {
      await pool.query(
        'UPDATE users SET is_super_admin = true, role = $1 WHERE id = $2',
        ['manager', user.id]
      );
      console.log(`${user.name} is now a super admin.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
