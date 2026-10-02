#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * One-time backfill for M5: encrypts any rider nationalId/licensePlate
 * values that predate the field-level encryption in models/User.js.
 *
 * Safe to run more than once - encryptField() is a no-op on a value that's
 * already in the "v1:..." encrypted format, so an already-migrated record
 * is left untouched (and skipped from the update count).
 *
 * Usage: MONGO_URI=... FIELD_ENCRYPTION_KEY=... node scripts/encryptRiderFields.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { encryptField } = require('../utils/fieldEncryption');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is required');
  process.exit(1);
}
if (!process.env.FIELD_ENCRYPTION_KEY) {
  console.error('FIELD_ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

const isEncrypted = (v) => typeof v === 'string' && v.startsWith('v1:');

(async () => {
  await mongoose.connect(MONGO_URI);

  // riderDetails.nationalId/licensePlate have a `get` transform, so a normal
  // query already decrypts on the way out - we need the RAW stored bytes
  // here to decide what still needs migrating, so read via the native driver
  // (bypasses Mongoose getters entirely) instead of the model.
  const raw = await mongoose.connection.db
    .collection('users')
    .find(
      {
        $or: [
          { 'riderDetails.nationalId': { $exists: true } },
          { 'riderDetails.licensePlate': { $exists: true } },
        ],
      },
      { projection: { 'riderDetails.nationalId': 1, 'riderDetails.licensePlate': 1 } }
    )
    .toArray();

  let migrated = 0;
  let alreadyDone = 0;
  let skipped = 0;

  for (const doc of raw) {
    const nationalId = doc.riderDetails?.nationalId;
    const licensePlate = doc.riderDetails?.licensePlate;
    const needsNationalId =
      nationalId !== undefined && nationalId !== null && !isEncrypted(nationalId);
    const needsLicensePlate =
      licensePlate !== undefined && licensePlate !== null && !isEncrypted(licensePlate);

    if (!needsNationalId && !needsLicensePlate) {
      if (nationalId || licensePlate) alreadyDone++;
      else skipped++;
      continue;
    }

    const update = {};
    if (needsNationalId) update['riderDetails.nationalId'] = encryptField(nationalId);
    if (needsLicensePlate) update['riderDetails.licensePlate'] = encryptField(licensePlate);

    await mongoose.connection.db.collection('users').updateOne({ _id: doc._id }, { $set: update });
    migrated++;
  }

  console.log(
    `Migrated: ${migrated}, already encrypted: ${alreadyDone}, skipped (no values): ${skipped}`
  );
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Migration failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
