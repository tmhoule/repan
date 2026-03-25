#!/usr/bin/env node
/**
 * Run database migrations programmatically without requiring npx
 * This script can be executed with: node src/scripts/migrate.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env file if it exists
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL environment variable is not set');
  console.error('  Please set DATABASE_URL in your .env file or environment');
  process.exit(1);
}

console.log('Running database migrations...');

try {
  // Get the prisma binary path from node_modules
  const prismaBin = path.join(__dirname, '../../node_modules/.bin/prisma');
  
  // Generate Prisma Client first
  console.log('Generating Prisma Client...');
  execSync(`"${prismaBin}" generate`, {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.join(__dirname, '../..')
  });
  
  // Run prisma migrate deploy
  console.log('Deploying migrations...');
  execSync(`"${prismaBin}" migrate deploy`, {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.join(__dirname, '../..')
  });
  
  console.log('✓ Database migrations completed successfully');
  process.exit(0);
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}
