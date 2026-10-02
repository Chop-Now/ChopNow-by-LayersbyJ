/**
 * M13 - maintenance mode is now enforced server-side, not just hidden behind
 * a frontend banner. Covers: a regular request is blocked with 503 while
 * maintenanceMode is on, an admin bypasses it regardless of active role,
 * and the routes that must never be blocked (settings, login, the pawaPay
 * webhook) stay reachable so an admin can always turn it back off and a
 * payment already in flight is never stuck.
 */
const request = require('supertest');
const app = require('./app');
const { createConsumer, createAdmin, setMaintenanceMode } = require('./fixtures');

afterEach(() => setMaintenanceMode(false)); // never leak into the next test

describe('Maintenance mode enforcement', () => {
  it('does not block anything while switched off', async () => {
    const res = await request(app).get('/api/v1/listings');
    expect(res.status).not.toBe(503);
  });

  it('blocks an unauthenticated request once switched on', async () => {
    await setMaintenanceMode(true);
    const res = await request(app).get('/api/v1/listings');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ maintenanceMode: true });
  });

  it('blocks a signed-in non-admin request', async () => {
    const { token } = await createConsumer();
    await setMaintenanceMode(true);
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
  });

  it('lets an admin through regardless of their active role', async () => {
    const { token } = await createAdmin();
    await setMaintenanceMode(true);
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(503);
  });

  it('never blocks reading or writing platform settings, so an admin can always turn it back off', async () => {
    const { token } = await createAdmin();
    await setMaintenanceMode(true);
    const read = await request(app).get('/api/v1/settings').set('Authorization', `Bearer ${token}`);
    expect(read.status).not.toBe(503);

    const write = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ maintenanceMode: false });
    expect(write.status).not.toBe(503);
    expect(write.body.settings.maintenanceMode).toBe(false);
  });

  it('never blocks logging in, so a locked-out admin can still sign back in for a bypass token', async () => {
    const admin = await createAdmin();
    await setMaintenanceMode(true);
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: admin.user.email, password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('never blocks the pawaPay webhook, so payments in flight are never stuck', async () => {
    await setMaintenanceMode(true);
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ depositId: 'not-a-real-deposit', status: 'COMPLETED' });
    // Not 503 - the webhook's own logic runs and reports "not found", exactly
    // as it would with maintenance mode off.
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/not found or already processed/i);
  });
});
