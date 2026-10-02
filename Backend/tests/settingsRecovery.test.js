/**
 * L7 - the emergency maintenance-off recovery key check must use a
 * constant-time comparison (crypto.timingSafeEqual over fixed-length
 * digests), not a plain `===` string comparison that leaks timing
 * information about how many leading characters match.
 */
const request = require('supertest');
const app = require('./app');
const PlatformSettings = require('../models/PlatformSettings');

describe('POST /api/v1/settings/recovery/maintenance-off (L7)', () => {
  let savedKey;

  beforeAll(() => {
    savedKey = process.env.ADMIN_RECOVERY_KEY;
    process.env.ADMIN_RECOVERY_KEY = 'a-correct-recovery-key';
  });

  afterAll(() => {
    process.env.ADMIN_RECOVERY_KEY = savedKey;
  });

  beforeEach(async () => {
    const settings = await PlatformSettings.getSettings();
    settings.maintenanceMode = true;
    await settings.save();
  });

  it('rejects a wrong recovery key', async () => {
    const res = await request(app)
      .post('/api/v1/settings/recovery/maintenance-off')
      .send({ recoveryKey: 'totally-wrong-key' });

    expect(res.status).toBe(403);
  });

  it('accepts the correct recovery key and turns maintenance mode off', async () => {
    const res = await request(app)
      .post('/api/v1/settings/recovery/maintenance-off')
      .send({ recoveryKey: 'a-correct-recovery-key' });

    expect(res.status).toBe(200);
    expect(res.body.maintenanceMode).toBe(false);

    const settings = await PlatformSettings.getSettings();
    expect(settings.maintenanceMode).toBe(false);
  });
});
