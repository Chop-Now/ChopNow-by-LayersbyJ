#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * MongoDB Backup Script
 * Usage: node scripts/backup.js
 *
 * Environment variables:
 *   MONGO_URI - MongoDB connection string
 *   BACKUP_DIR - Directory to store local backups (default: ./backups)
 *   MAX_BACKUPS - How many local backups to retain (default: 7)
 *   BACKUP_S3_BUCKET - If set, uploads a zipped copy of each backup here.
 *   BACKUP_S3_PREFIX - Key prefix inside the bucket (default: chopnow-backups)
 *   BACKUP_S3_ENDPOINT - Custom endpoint for an S3-compatible provider
 *     (Backblaze B2, Cloudflare R2, MinIO, ...). Leave unset for real AWS S3.
 *   BACKUP_S3_REGION - Region (default: us-east-1; some S3-compatible
 *     providers ignore this but the SDK requires something be set).
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY - credentials for the bucket.
 *
 * Requires mongodump to be installed on the system (Render Cron Jobs and the
 * GitHub Actions workflow both install it before running this script).
 */

require('dotenv').config();
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const MONGO_URI = process.env.MONGO_URI;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 7;
const S3_BUCKET = process.env.BACKUP_S3_BUCKET;
const S3_PREFIX = process.env.BACKUP_S3_PREFIX || 'chopnow-backups';

if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is required');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupName = `backup-${timestamp}`;
const backupPath = path.join(BACKUP_DIR, backupName);

// Zips a mongodump directory into <dir>.zip alongside it. Returns the zip's path.
function zipDirectory(dirPath) {
  return new Promise((resolve, reject) => {
    const zipPath = `${dirPath}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(dirPath, false);
    archive.finalize();
  });
}

async function uploadToS3(zipPath, key) {
  const client = new S3Client({
    region: process.env.BACKUP_S3_REGION || 'us-east-1',
    ...(process.env.BACKUP_S3_ENDPOINT
      ? { endpoint: process.env.BACKUP_S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
  const body = fs.readFileSync(zipPath);
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/zip',
    })
  );
}

(async () => {
  console.log(`Starting backup to ${backupPath}...`);

  try {
    // execFileSync (no shell): interpolating the URI into a shell string let
    // the shell expand characters in the password (e.g. "$@" is deleted as a
    // variable), silently corrupting the URI.
    execFileSync('mongodump', [`--uri=${MONGO_URI}`, `--out=${backupPath}`], {
      stdio: 'inherit',
    });
    console.log(`Local mongodump completed: ${backupPath}`);

    if (S3_BUCKET) {
      console.log('Zipping backup for offsite upload...');
      const zipPath = await zipDirectory(backupPath);
      const key = `${S3_PREFIX}/${backupName}.zip`;
      console.log(`Uploading to s3://${S3_BUCKET}/${key} ...`);
      await uploadToS3(zipPath, key);
      fs.rmSync(zipPath, { force: true }); // local zip was only for upload; the local mongodump dir is the retained local copy
      console.log('Offsite upload complete.');
    } else {
      console.log('BACKUP_S3_BUCKET not set - skipping offsite upload (local backup only).');
    }

    // Clean up old local backups (keep only MAX_BACKUPS most recent). Offsite
    // copies are retained by the bucket's own lifecycle rules, not here.
    const backups = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('backup-') && !f.endsWith('.zip'))
      .sort()
      .reverse();

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const dir of toDelete) {
        fs.rmSync(path.join(BACKUP_DIR, dir), { recursive: true, force: true });
        console.log(`Deleted old local backup: ${dir}`);
      }
    }

    console.log(
      `Backup rotation complete. Keeping ${Math.min(backups.length, MAX_BACKUPS)} local backups.`
    );
  } catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
})();
