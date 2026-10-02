/**
 * Phase 7 regression - GET /api/v1/analytics/platform/activity and
 * /api/v1/analytics/user-activity both read `user.role` / `order.customer.role`,
 * a field that doesn't exist on the User model (only `roles` and `activeRole`
 * do) - found live while verifying Phase 7's Admin dashboard, the admin
 * activity feed said "has registered as a undefined" for every user
 * regardless of their real role.
 */
const request = require('supertest');
const app = require('./app');
const { createAdmin, createBusinessOwnerWithBusiness, createConsumer } = require('./fixtures');

describe('GET /api/v1/analytics/platform/activity (Phase 7)', () => {
  it('describes a new user by their real role, not "undefined"', async () => {
    const { token: adminToken } = await createAdmin();
    await createConsumer({ firstName: 'Real', lastName: 'Consumer' });

    const res = await request(app)
      .get('/api/v1/analytics/platform/activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const entry = res.body.activities.find(
      (a) => a.type === 'user' && a.description?.includes('Real Consumer')
    );
    expect(entry).toBeDefined();
    expect(entry.description).not.toContain('undefined');
    expect(entry.description).toContain('consumer');
  });

  it('describes a new vendor as "vendor", not "undefined"', async () => {
    const { token: adminToken } = await createAdmin();
    const { user } = await createBusinessOwnerWithBusiness();
    // createBusinessOwnerWithBusiness registers via the real endpoint with
    // firstName 'Test'/lastName 'Vendor' - see tests/fixtures.js.

    const res = await request(app)
      .get('/api/v1/analytics/platform/activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const entry = res.body.activities.find(
      (a) => a.type === 'user' && a.description?.includes(user.firstName)
    );
    expect(entry).toBeDefined();
    expect(entry.description).not.toContain('undefined');
    expect(entry.description).toContain('vendor');
  });
});

describe('GET /api/v1/analytics/user-activity (Phase 7)', () => {
  it("tags a registration activity with the user's real role", async () => {
    const { token: adminToken } = await createAdmin();
    await createConsumer({ firstName: 'Real', lastName: 'Consumer' });

    const res = await request(app)
      .get('/api/v1/analytics/user-activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const entry = res.body.activities.find((a) => a.user?.name === 'Real Consumer');
    expect(entry).toBeDefined();
    expect(entry.user.role).toBe('consumer');
    expect(entry.details).not.toContain('undefined');
  });
});
