#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Restores a backup produced by scripts/backup.js.
 * Usage: node scripts/restore.js <backup-key>
 *   <backup-key> is the S3 key's basename (e.g. backup-2026-09-24T12-00-00-000Z),
 *   with or without the .zip extension.
 *
 * Environment variables:
 *   MONGO_URI - target database to restore INTO. Always double-check this -
 *     mongorestore can overwrite existing collections.
 *   BACKUP_S3_BUCKET / BACKUP_S3_PREFIX / BACKUP_S3_ENDPOINT / BACKUP_S3_REGION
 *     - same meaning as in backup.js; used to find the backup to download.
 *   RESTORE_DIR - scratch directory to download/extract into
 *     (default: ./restore-tmp, removed after a successful restore).
 *
 * Requires mongorestore to be installed on the system.
 */

require('dotenv').config();
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const MONGO_URI = process.env.MONGO_URI;
const S3_BUCKET = process.env.BACKUP_S3_BUCKET;
const S3_PREFIX = process.env.BACKUP_S3_PREFIX || 'chopnow-backups';
const RESTORE_DIR = process.env.RESTORE_DIR || path.join(__dirname, '..', 'restore-tmp');

const backupKeyArg = process.argv[2];

if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is required (the restore TARGET)');
  process.exit(1);
}
if (!S3_BUCKET) {
  console.error('BACKUP_S3_BUCKET environment variable is required');
  process.exit(1);
}
if (!backupKeyArg) {
  console.error('Usage: node scripts/restore.js <backup-key>');
  process.exit(1);
}

const backupName = backupKeyArg.replace(/\.zip$/, '');
const key = `${S3_PREFIX}/${backupName}.zip`;

async function downloadFromS3(destZipPath) {
  const client = new S3Client({
    region: process.env.BACKUP_S3_REGION || 'us-east-1',
    ...(process.env.BACKUP_S3_ENDPOINT
      ? { endpoint: process.env.BACKUP_S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
  const res = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  fs.writeFileSync(destZipPath, Buffer.concat(chunks));
}

(async () => {
  try {
    if (fs.existsSync(RESTORE_DIR)) fs.rmSync(RESTORE_DIR, { recursive: true, force: true });
    fs.mkdirSync(RESTORE_DIR, { recursive: true });

    const zipPath = path.join(RESTORE_DIR, `${backupName}.zip`);
    console.log(`Downloading s3://${S3_BUCKET}/${key} ...`);
    await downloadFromS3(zipPath);

    const extractDir = path.join(RESTORE_DIR, backupName);
    console.log(`Extracting to ${extractDir} ...`);
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractDir }))
      .promise();

    // mongodump nests its output one level under the source database's name
    // (extractDir/<originalDbName>/<collection>.bson). Since MONGO_URI
    // already pins the restore target's database by name, mongorestore
    // needs to be pointed at that per-database subfolder directly - given
    // the parent dump directory instead, it silently skips the subfolder
    // and "succeeds" having restored nothing. This works regardless of
    // whether the target db name matches the one the backup was taken from
    // (restoring into a scratch/staging db with a different name included).
    const dbDirs = fs
      .readdirSync(extractDir)
      .filter((f) => fs.statSync(path.join(extractDir, f)).isDirectory());
    if (dbDirs.length !== 1) {
      throw new Error(
        `Expected exactly one database directory in the backup, found: ${dbDirs.join(', ') || '(none)'}`
      );
    }
    const dumpSourceDir = path.join(extractDir, dbDirs[0]);

    // Never log the URI itself - it embeds the database password.
    console.log(`Running mongorestore (from backed-up db "${dbDirs[0]}") ...`);
    execFileSync('mongorestore', [`--uri=${MONGO_URI}`, '--drop', dumpSourceDir], {
      stdio: 'inherit',
    });

    fs.rmSync(RESTORE_DIR, { recursive: true, force: true });
    console.log('Restore completed successfully.');
  } catch (error) {
    console.error('Restore failed:', error.message);
    process.exit(1);
  }
})();
