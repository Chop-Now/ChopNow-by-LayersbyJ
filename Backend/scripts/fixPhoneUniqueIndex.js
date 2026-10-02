#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * User.js declares `phone: { type: String, unique: true, sparse: true }`,
 * but that only creates the index automatically on a fresh collection -
 * on an existing one (like this project's production Atlas cluster), the
 * schema change alone does nothing. Confirmed live 2026-09-26: registering
 * a brand-new account with a phone number already used by another account
 * succeeded with no error at all, proving the unique constraint doesn't
 * actually exist in the database.
 *
 * This script is safe by default - it never changes or deletes any user
 * data. It only:
 *   1. Reports every phone number currently shared by 2+ accounts, so a
 *      human can decide what to do about each one (which account keeps the
 *      number, whether to contact the affected users, etc.) - this script
 *      deliberately does not make that call.
 *   2. With --build-index, builds the unique index on `phone` - but only
 *      after re-confirming zero duplicates remain, so it can never partially
 *      apply a doomed index build. If duplicates still exist, it refuses and
 *      prints the same report again instead.
 *
 * Usage:
 *   MONGO_URI=... node scripts/fixPhoneUniqueIndex.js              (report only)
 *   MONGO_URI=... node scripts/fixPhoneUniqueIndex.js --build-index (report, then build if clean)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is required');
  process.exit(1);
}

const shouldBuildIndex = process.argv.includes('--build-index');

async function findDuplicatePhones(usersCollection) {
  return usersCollection
    .aggregate([
      // sparse:true means the unique constraint never applies to docs
      // missing the field - match that here too, so a genuinely-absent
      // phone is never treated as a "duplicate" against other absent ones.
      { $match: { phone: { $type: 'string', $ne: '' } } },
      {
        $group: {
          _id: '$phone',
          count: { $sum: 1 },
          users: { $push: { id: '$_id', email: '$email', createdAt: '$createdAt' } },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

(async () => {
  await mongoose.connect(MONGO_URI);
  const usersCollection = mongoose.connection.db.collection('users');

  const duplicates = await findDuplicatePhones(usersCollection);

  if (duplicates.length === 0) {
    console.log('No duplicate phone numbers found.');
  } else {
    console.log(`Found ${duplicates.length} phone number(s) shared by more than one account:\n`);
    for (const dup of duplicates) {
      console.log(`  Phone ${dup._id} - ${dup.count} accounts:`);
      for (const u of dup.users) {
        console.log(
          `    ${u.id}  ${u.email}  (created ${u.createdAt?.toISOString?.() || u.createdAt})`
        );
      }
      console.log('');
    }
    console.log(
      'Nothing has been changed. Decide per phone number which account should keep it ' +
        "(update or clear the others' `phone` field directly, e.g. via Compass or a targeted " +
        'updateOne), then re-run this script to confirm zero duplicates remain.'
    );
  }

  if (shouldBuildIndex) {
    if (duplicates.length > 0) {
      console.log(
        '\n--build-index requested, but duplicates still exist above - refusing to build the index.'
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log('\nNo duplicates - building the unique index on `phone` (sparse)...');
    try {
      const indexName = await usersCollection.createIndex(
        { phone: 1 },
        { unique: true, sparse: true }
      );
      console.log(`Index built: ${indexName}`);
    } catch (err) {
      console.error('Index build failed:', err.message);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('Script failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
