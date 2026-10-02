#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * MongoDB Migration Runner
 *
 * Usage:
 *   node scripts/migrate.js up        - Run all pending migrations
 *   node scripts/migrate.js down      - Rollback last migration
 *   node scripts/migrate.js status    - Show migration status
 *   node scripts/migrate.js create <name> - Create a new migration file
 *
 * Migrations are stored in /migrations directory.
 * Applied migrations are tracked in the _migrations collection.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
});
const Migration = mongoose.model('_Migration', migrationSchema);

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI environment variable is required');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();
}

async function getAppliedMigrations() {
  const applied = await Migration.find().sort({ name: 1 }).lean();
  return applied.map((m) => m.name);
}

async function runUp() {
  await connect();

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();
  const pending = files.filter((f) => !applied.includes(f));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    process.exit(0);
  }

  console.log(`Found ${pending.length} pending migration(s).\n`);

  for (const file of pending) {
    console.log(`Running: ${file}...`);
    const migration = require(path.join(MIGRATIONS_DIR, file));

    if (typeof migration.up !== 'function') {
      console.error(`  ERROR: ${file} does not export an 'up' function. Skipping.`);
      continue;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await migration.up(mongoose.connection.db, session);
        await Migration.create([{ name: file }], { session });
      });
      console.log(`  Applied: ${file}`);
    } catch (err) {
      console.error(`  FAILED: ${file} - ${err.message}`);
      process.exit(1);
    } finally {
      session.endSession();
    }
  }

  console.log('\nAll migrations applied successfully.');
  process.exit(0);
}

async function runDown() {
  await connect();

  const applied = await getAppliedMigrations();
  if (applied.length === 0) {
    console.log('No migrations to rollback.');
    process.exit(0);
  }

  const lastApplied = applied[applied.length - 1];
  const filePath = path.join(MIGRATIONS_DIR, lastApplied);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${lastApplied}`);
    process.exit(1);
  }

  const migration = require(filePath);
  if (typeof migration.down !== 'function') {
    console.error(`${lastApplied} does not export a 'down' function. Cannot rollback.`);
    process.exit(1);
  }

  console.log(`Rolling back: ${lastApplied}...`);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await migration.down(mongoose.connection.db, session);
      await Migration.deleteOne({ name: lastApplied }, { session });
    });
    console.log(`Rolled back: ${lastApplied}`);
  } catch (err) {
    console.error(`FAILED to rollback: ${lastApplied} - ${err.message}`);
    process.exit(1);
  } finally {
    session.endSession();
  }

  process.exit(0);
}

async function showStatus() {
  await connect();

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();

  console.log('Migration Status:\n');
  console.log('Status     | Migration');
  console.log('-----------|------------------------------------------');

  for (const file of files) {
    const status = applied.includes(file) ? 'Applied  ' : 'Pending  ';
    console.log(`${status}  | ${file}`);
  }

  if (files.length === 0) {
    console.log('No migration files found.');
  }

  console.log(
    `\nTotal: ${files.length} | Applied: ${applied.length} | Pending: ${files.length - applied.length}`
  );
  process.exit(0);
}

function createMigration(name) {
  if (!name) {
    console.error('Please provide a migration name: node scripts/migrate.js create <name>');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const fileName = `${timestamp}_${safeName}.js`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  async up(db, session) {
    // Write your migration here
    // Example: await db.collection('users').updateMany({}, { $set: { newField: 'default' } }, { session });
  },

  async down(db, session) {
    // Write the rollback here
    // Example: await db.collection('users').updateMany({}, { $unset: { newField: '' } }, { session });
  }
};
`;

  fs.writeFileSync(filePath, template);
  console.log(`Created migration: ${fileName}`);
  console.log(`  Path: ${filePath}`);
  process.exit(0);
}

// CLI handler
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'up':
    runUp();
    break;
  case 'down':
    runDown();
    break;
  case 'status':
    showStatus();
    break;
  case 'create':
    createMigration(arg);
    break;
  default:
    console.log('Usage: node scripts/migrate.js <up|down|status|create> [name]');
    process.exit(1);
}
