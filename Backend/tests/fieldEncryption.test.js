/**
 * M5 - rider nationalId/licensePlate are encrypted at rest (AES-256-GCM,
 * utils/fieldEncryption.js) rather than stored as plain strings. Covers the
 * encryption utility directly, the User model's transparent encrypt-on-
 * write/decrypt-on-read behavior, the two response-serialization pitfalls
 * that were found and fixed while implementing this (a .lean() query and a
 * subdocument pulled into a plain object both bypass Mongoose getters), and
 * the admin riders-list endpoint end to end.
 */
jest.mock('../utils/cloudinaryUpload', () => ({
  uploadToCloudinary: jest
    .fn()
    .mockResolvedValue({ secure_url: 'https://cloudinary.example/fake.jpg' }),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./app');
const User = require('../models/User');
const { createAdmin, createConsumer } = require('./fixtures');
const { encryptField, decryptField } = require('../utils/fieldEncryption');

describe('fieldEncryption utility', () => {
  it('should round-trip a value through encrypt/decrypt', () => {
    const encrypted = encryptField('1199580001234567');
    expect(encrypted).toMatch(/^v1:/);
    expect(encrypted).not.toContain('1199580001234567');
    expect(decryptField(encrypted)).toBe('1199580001234567');
  });

  it('should produce a different ciphertext each time (random IV, not deterministic)', () => {
    const a = encryptField('same-value');
    const b = encryptField('same-value');
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe('same-value');
    expect(decryptField(b)).toBe('same-value');
  });

  it('should pass through null/undefined/empty string unchanged', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField(undefined)).toBeUndefined();
    expect(encryptField('')).toBe('');
    expect(decryptField(null)).toBeNull();
    expect(decryptField(undefined)).toBeUndefined();
  });

  it('should treat un-prefixed values as legacy plaintext and return them as-is (no crash pre-migration)', () => {
    expect(decryptField('RA 123 A')).toBe('RA 123 A');
  });

  it('should trim whitespace before encrypting', () => {
    expect(decryptField(encryptField('  RA 123 A  '))).toBe('RA 123 A');
  });

  it('should not double-encrypt an already-encrypted value', () => {
    const once = encryptField('some-id');
    expect(encryptField(once)).toBe(once);
  });
});

describe('User model: riderDetails.nationalId/licensePlate encryption', () => {
  it('should store ciphertext at rest but decrypt on normal Mongoose reads', async () => {
    const user = await User.create({
      email: 'rider-enc@example.com',
      passwordHash: 'x',
      firstName: 'R',
      lastName: 'T',
      roles: ['rider'],
      riderDetails: { nationalId: '1199580001234567', licensePlate: 'RAB 123 C' },
    });

    // Raw bytes on disk (bypasses Mongoose getters entirely) must NOT be plaintext.
    const raw = await mongoose.connection.db.collection('users').findOne({ _id: user._id });
    expect(raw.riderDetails.nationalId).toMatch(/^v1:/);
    expect(raw.riderDetails.licensePlate).toMatch(/^v1:/);
    expect(raw.riderDetails.nationalId).not.toContain('1199580001234567');

    // A normal Mongoose read decrypts transparently.
    const reloaded = await User.findById(user._id);
    expect(reloaded.riderDetails.nationalId).toBe('1199580001234567');
    expect(reloaded.riderDetails.licensePlate).toBe('RAB 123 C');

    // Serializing the WHOLE document (res.json(user) style) also decrypts.
    expect(JSON.parse(JSON.stringify(reloaded)).riderDetails.nationalId).toBe('1199580001234567');
  });

  it('should leak ciphertext when a subdocument is serialized on its own, even with { getters: true } (documents the pitfall found and fixed in applyRider)', async () => {
    const user = await User.create({
      email: 'rider-enc2@example.com',
      passwordHash: 'x',
      firstName: 'R',
      lastName: 'T',
      roles: ['rider'],
      riderDetails: { nationalId: '1199580009999999' },
    });
    const reloaded = await User.findById(user._id);

    // Neither of these inherits the parent schema's toJSON getters:true -
    // both still return raw ciphertext. Confirmed by testing, not assumed:
    // this rules out ".toObject({ getters: true })" as a fix.
    const naive = JSON.parse(JSON.stringify({ riderDetails: reloaded.riderDetails }));
    expect(naive.riderDetails.nationalId).toMatch(/^v1:/);
    expect(reloaded.riderDetails.toObject({ getters: true }).nationalId).toMatch(/^v1:/);

    // The actual fix used in userController.js's applyRider response:
    // decrypt explicitly via direct property access (which IS reliable).
    expect(decryptField(reloaded.riderDetails.nationalId)).toBe('1199580009999999');
  });
});

describe('POST /api/v1/users/apply-rider - response and storage', () => {
  it('should store nationalId/licensePlate encrypted but return decrypted values in the response', async () => {
    const { token, user } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/users/apply-rider')
      .set('Authorization', `Bearer ${token}`)
      .field('phone', '0788000222')
      .field('vehicleType', 'motorcycle')
      .field('nationalId', '1199580005556667')
      .field('licensePlate', 'RAD 789 E')
      .attach('vehiclePhoto', Buffer.from('fake-image-bytes'), 'vehicle.jpg')
      .attach('nationalIdPhoto', Buffer.from('fake-image-bytes'), 'id.jpg');

    expect(res.status).toBe(200);
    expect(res.body.riderDetails.nationalId).toBe('1199580005556667');
    expect(res.body.riderDetails.licensePlate).toBe('RAD 789 E');

    const raw = await mongoose.connection.db
      .collection('users')
      .findOne({ _id: new mongoose.Types.ObjectId(user._id) });
    expect(raw.riderDetails.nationalId).toMatch(/^v1:/);
    expect(raw.riderDetails.licensePlate).toMatch(/^v1:/);
  });
});

describe('GET /api/v1/users/admin/riders - decrypts for .lean() results', () => {
  it('should return decrypted nationalId/licensePlate, not raw ciphertext', async () => {
    const { token } = await createAdmin();
    await User.create({
      email: 'rider-list@example.com',
      passwordHash: 'x',
      firstName: 'Lean',
      lastName: 'Rider',
      roles: ['rider'],
      riderStatus: 'pending',
      riderDetails: {
        phone: '0788000111',
        vehicleType: 'motorcycle',
        nationalId: '1199580001112223',
        licensePlate: 'RAC 456 D',
        appliedAt: new Date(),
      },
    });

    const res = await request(app)
      .get('/api/v1/users/admin/riders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const rider = res.body.riders.find((r) => r.email === 'rider-list@example.com');
    expect(rider).toBeTruthy();
    expect(rider.riderDetails.nationalId).toBe('1199580001112223');
    expect(rider.riderDetails.licensePlate).toBe('RAC 456 D');
  });
});
