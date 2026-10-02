/**
 * Auth Endpoint Tests
 *
 * Covers:
 *   POST /api/v1/users/register
 *   POST /api/v1/users/login
 *   POST /api/v1/users/refresh-token
 *   GET  /api/v1/users/profile
 */
const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const { createAdmin, createConsumer } = require('./fixtures');
const AuditLog = require('../models/AuditLog');

// ── Helpers ──────────────────────────────────────────────────────────
const validUser = {
  email: 'test@example.com',
  password: 'Password1',
  firstName: 'Test',
  lastName: 'User',
};

/**
 * Register a user and return the supertest response.
 */
const registerUser = async (overrides = {}) => {
  const res = await request(app)
    .post('/api/v1/users/register')
    .send({ ...validUser, ...overrides });
  return res;
};

/**
 * Register a user and mark their email verified, so password login is
 * allowed while the (default-on) requireEmailVerification setting applies.
 */
const registerVerifiedUser = async (overrides = {}) => {
  const res = await registerUser(overrides);
  await User.updateOne({ _id: res.body._id }, { emailVerified: true });
  return res;
};

// ─────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/users/register', () => {
  it('should register a new user and return 201 with tokens', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', validUser.email);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('firstName', validUser.firstName);
    expect(res.body).toHaveProperty('lastName', validUser.lastName);
    expect(res.body).toHaveProperty('roles');
    expect(res.body.roles).toContain('consumer');
    // passwordHash must never leak
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('should return 400 when required fields are missing', async () => {
    // Missing password and names
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: 'missing@fields.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ password: 'Password1', firstName: 'No', lastName: 'Email' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 400 for duplicate email registration', async () => {
    // First registration succeeds
    await registerUser();

    // Second registration with the same email should fail
    const res = await registerUser();

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/already exists|duplicate/i);
  });

  // Regression tests for the C1 privilege-escalation finding: a self-registering
  // user must never be able to grant themselves admin or rider via the public
  // registration endpoint, whether through 'roles' (array) or 'role' (legacy).
  it('should reject roles:["admin"] at the validation layer', async () => {
    const res = await registerUser({ email: 'wannabe-admin@example.com', roles: ['admin'] });

    expect(res.status).toBe(400);
  });

  it('should reject role:"admin" (legacy field) at the validation layer', async () => {
    const res = await registerUser({ email: 'wannabe-admin-2@example.com', role: 'admin' });

    expect(res.status).toBe(400);
  });

  it('should never grant admin even if a mixed roles array reaches the controller', async () => {
    // roles containing one valid + one forbidden role must still be rejected by
    // validation (defense layer 1); this also documents that IF validation were
    // ever bypassed, registerUser's own SELF_REGISTERABLE_ROLES filter (defense
    // layer 2) strips 'admin' and keeps only 'consumer'.
    const res = await registerUser({
      email: 'mixed-roles@example.com',
      roles: ['consumer', 'admin'],
    });

    expect(res.status).toBe(400);
  });

  it('should reject roles:["rider"] at registration - rider is admin-granted only', async () => {
    const res = await registerUser({ email: 'wannabe-rider@example.com', roles: ['rider'] });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/users/login', () => {
  beforeEach(async () => {
    // Seed a (verified) user to login against
    await registerVerifiedUser();
  });

  it('should login with valid credentials and return 200 with token', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', validUser.email);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: validUser.email, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app).post('/api/v1/users/login').send({ password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app).post('/api/v1/users/login').send({ email: validUser.email });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Refresh Token
// ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/users/refresh-token', () => {
  let refreshToken;

  beforeEach(async () => {
    const res = await registerUser();
    refreshToken = res.body.refreshToken;
  });

  it('should return 200 with new tokens when given a valid refresh token', async () => {
    const res = await request(app).post('/api/v1/users/refresh-token').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('should return 401 when given an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/users/refresh-token')
      .send({ refreshToken: 'this.is.not.valid' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/v1/users/refresh-token').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Profile (authenticated)
// ─────────────────────────────────────────────────────────────────────
describe('GET /api/v1/users/profile', () => {
  let token;
  let refreshTokenForH1;

  beforeEach(async () => {
    const res = await registerUser();
    token = res.body.token;
    refreshTokenForH1 = res.body.refreshToken;
  });

  it('should return 200 with user data when given a valid auth header', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', validUser.email);
    expect(res.body).toHaveProperty('firstName', validUser.firstName);
    expect(res.body).toHaveProperty('lastName', validUser.lastName);
    // Sensitive fields must be stripped by the toJSON transform
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('verificationToken');
    expect(res.body).not.toHaveProperty('otpCode');
  });

  it('should return 401 when no auth header is provided', async () => {
    const res = await request(app).get('/api/v1/users/profile');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 401 when auth token is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  // Regression test for H1: a refresh token (type: 'refresh', 7-day life) must
  // never work as a Bearer access token, even though it's signed with the same
  // secret and would otherwise pass jwt.verify.
  it('should return 401 when a refresh token is used as the Bearer access token', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${refreshTokenForH1}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });
});

// ─────────────────────────────────────────────────────────────────────
// L2: PUT /profile - explicit "was this field provided" merge + validation
// ─────────────────────────────────────────────────────────────────────
describe('PUT /api/v1/users/profile', () => {
  let token;

  beforeEach(async () => {
    const res = await registerUser();
    token = res.body.token;
  });

  it('updates only the fields provided, leaving others untouched', async () => {
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Updated');
    expect(res.body.lastName).toBe(validUser.lastName);
  });

  it('rejects an explicit empty-string firstName instead of silently keeping the old value', async () => {
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: '' });

    expect(res.status).toBe(400);

    const profile = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profile.body.firstName).toBe(validUser.firstName);
  });

  it('rejects a malformed phone number', async () => {
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: 'not-a-phone' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────
// OTP login validation (C3) - these routes previously had zero validation,
// so a non-string email/otp (e.g. a Mongo operator object) reached
// User.findOne() unvalidated.
// ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/users/send-otp and /verify-otp validation', () => {
  it('should reject a Mongo-operator-shaped body at /verify-otp, not return a token', async () => {
    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: { $ne: null }, otp: { $ne: null } });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('token');
  });

  it('should reject a Mongo-operator-shaped email at /send-otp', async () => {
    const res = await request(app)
      .post('/api/v1/users/send-otp')
      .send({ email: { $ne: null } });

    expect(res.status).toBe(400);
  });

  it('should reject a non-numeric otp at /verify-otp', async () => {
    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'someone@example.com', otp: 'abcdef' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Token revocation via tokenVersion (H3)
// ─────────────────────────────────────────────────────────────────────
describe('Token revocation (tokenVersion)', () => {
  let token;
  let refreshToken;

  beforeEach(async () => {
    const res = await registerUser();
    token = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('should reject a pre-logout-all access token after POST /logout-all', async () => {
    // Sanity check: the token works before logout-all.
    const before = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);

    const logoutRes = await request(app)
      .post('/api/v1/users/logout-all')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
  });

  it('should reject a pre-logout-all refresh token at POST /refresh-token', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/users/logout-all')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app)
      .post('/api/v1/users/refresh-token')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────
// httpOnly refresh-token cookie + CSRF double-submit (H2)
// ─────────────────────────────────────────────────────────────────────
const findCookie = (setCookieHeader, name) => {
  const line = (setCookieHeader || []).find((c) => c.startsWith(`${name}=`));
  if (!line) return null;
  return line.split(';')[0].split('=')[1];
};

describe('httpOnly refresh-token cookie and CSRF (H2)', () => {
  it('should set an httpOnly refreshToken cookie and a readable csrfToken cookie on login', async () => {
    await registerVerifiedUser();
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();

    // Cookie flags are environment-conditional (see Backend/utils/authCookies.js):
    // production needs SameSite=None; Secure (frontend/backend are cross-site -
    // Vercel vs Render); tests run with NODE_ENV=test, same as local dev, which
    // gets SameSite=Lax and no Secure so the cookie is actually storable over
    // plain HTTP. The production-flag behavior itself is covered by the unit
    // test below, which flips NODE_ENV directly.
    const refreshCookieLine = setCookie.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookieLine).toBeDefined();
    expect(refreshCookieLine).toMatch(/HttpOnly/i);
    expect(refreshCookieLine).toMatch(/SameSite=Lax/i);
    expect(refreshCookieLine).not.toMatch(/Secure/i);

    const csrfCookieLine = setCookie.find((c) => c.startsWith('csrfToken='));
    expect(csrfCookieLine).toBeDefined();
    expect(csrfCookieLine).not.toMatch(/HttpOnly/i);

    expect(res.body).toHaveProperty('csrfToken');
    expect(res.body.csrfToken).toBe(findCookie(setCookie, 'csrfToken'));
  });

  it('should refresh using only the cookie + matching X-CSRF-Token header (no body)', async () => {
    const regRes = await registerUser();
    const setCookie = regRes.headers['set-cookie'];
    const refreshCookie = findCookie(setCookie, 'refreshToken');
    const csrfToken = findCookie(setCookie, 'csrfToken');

    const res = await request(app)
      .post('/api/v1/users/refresh-token')
      .set('Cookie', [`refreshToken=${refreshCookie}`, `csrfToken=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject a cookie-sourced refresh with a missing/mismatched CSRF header', async () => {
    const regRes = await registerUser();
    const setCookie = regRes.headers['set-cookie'];
    const refreshCookie = findCookie(setCookie, 'refreshToken');
    const csrfToken = findCookie(setCookie, 'csrfToken');

    // No X-CSRF-Token header at all.
    const noHeaderRes = await request(app)
      .post('/api/v1/users/refresh-token')
      .set('Cookie', [`refreshToken=${refreshCookie}`, `csrfToken=${csrfToken}`])
      .send({});
    expect(noHeaderRes.status).toBe(403);

    // Wrong X-CSRF-Token value.
    const wrongHeaderRes = await request(app)
      .post('/api/v1/users/refresh-token')
      .set('Cookie', [`refreshToken=${refreshCookie}`, `csrfToken=${csrfToken}`])
      .set('X-CSRF-Token', 'not-the-real-token')
      .send({});
    expect(wrongHeaderRes.status).toBe(403);
  });

  it('should still refresh via body-only refreshToken with no CSRF header (Mobile compatibility)', async () => {
    const regRes = await registerUser();

    const res = await request(app)
      .post('/api/v1/users/refresh-token')
      .send({ refreshToken: regRes.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should clear the refresh/csrf cookies on logout-all', async () => {
    const regRes = await registerUser();
    const token = regRes.body.token;

    const res = await request(app)
      .post('/api/v1/users/logout-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    const refreshCookieLine = setCookie.find((c) => c.startsWith('refreshToken='));
    // clearCookie sends an already-expired cookie with an empty value.
    expect(refreshCookieLine).toMatch(/refreshToken=;/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Email verification (C12)
// ─────────────────────────────────────────────────────────────────────
describe('Email verification (C12)', () => {
  const loginAs = () =>
    request(app)
      .post('/api/v1/users/login')
      .send({ email: validUser.email, password: validUser.password });

  it('should block login for an unverified account while the setting is on', async () => {
    await registerUser();
    const res = await loginAs();

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body).not.toHaveProperty('token');
  });

  it('should allow login for an unverified account once an admin turns the setting off', async () => {
    await registerUser();
    await PlatformSettings.updateOne({}, { requireEmailVerification: false }, { upsert: true });

    const res = await loginAs();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should never block an admin, so the setting cannot lock admins out', async () => {
    const reg = await registerUser();
    await User.updateOne({ _id: reg.body._id }, { $addToSet: { roles: 'admin' } });

    const res = await loginAs();
    expect(res.status).toBe(200);
  });

  it('should verify the account from a valid /verify-email token, then allow login', async () => {
    await registerUser();
    const user = await User.findOne({ email: validUser.email }).select('+verificationToken');

    const verify = await request(app).get(
      `/api/v1/users/verify-email?token=${user.verificationToken}`
    );
    expect(verify.status).toBe(200);
    expect((await User.findById(user._id)).emailVerified).toBe(true);

    const res = await loginAs();
    expect(res.status).toBe(200);
  });

  it('should reject an invalid or expired token with a clear error', async () => {
    const res = await request(app).get('/api/v1/users/verify-email?token=not-a-real-token');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('should give the same resend response for unknown and existing emails (no enumeration)', async () => {
    await registerUser();
    const known = await request(app)
      .post('/api/v1/users/resend-verification')
      .send({ email: validUser.email });
    const unknown = await request(app)
      .post('/api/v1/users/resend-verification')
      .send({ email: 'nobody-here@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });
});

// ─────────────────────────────────────────────────────────────────────
// OTP login flow (M2)
// ─────────────────────────────────────────────────────────────────────
describe('OTP login flow (POST /send-otp -> POST /verify-otp)', () => {
  it('should send an OTP, then log the user in with it', async () => {
    const reg = await registerUser({ email: 'otp-flow@example.com' });

    const sendRes = await request(app)
      .post('/api/v1/users/send-otp')
      .send({ email: 'otp-flow@example.com' });
    expect(sendRes.status).toBe(200);

    const stored = await User.findById(reg.body._id).select('+otpCode');
    expect(stored.otpCode).toMatch(/^\d{6}$/);

    const verifyRes = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'otp-flow@example.com', otp: stored.otpCode });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeTruthy();
    expect(verifyRes.body._id).toBe(reg.body._id);

    // The code is single-use (a second attempt with the same code fails) and
    // marks the account verified.
    const reuseRes = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'otp-flow@example.com', otp: stored.otpCode });
    expect(reuseRes.status).toBe(400);

    const afterVerify = await User.findById(reg.body._id);
    expect(afterVerify.emailVerified).toBe(true);
  });

  it('should reject the wrong OTP code', async () => {
    await registerUser({ email: 'otp-wrong@example.com' });
    await request(app).post('/api/v1/users/send-otp').send({ email: 'otp-wrong@example.com' });

    const res = await request(app)
      .post('/api/v1/users/verify-otp')
      .send({ email: 'otp-wrong@example.com', otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('token');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Forgot password / verify-reset-otp / reset-password (M2)
// ─────────────────────────────────────────────────────────────────────
describe('Forgot / verify-reset-otp / reset-password flow', () => {
  it('should walk through forgot -> verify -> reset, then require the new password to log in', async () => {
    const reg = await registerVerifiedUser({ email: 'reset-flow@example.com' });

    const forgotRes = await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'reset-flow@example.com' });
    expect(forgotRes.status).toBe(200);

    const stored = await User.findById(reg.body._id).select('+resetPasswordToken');
    expect(stored.resetPasswordToken).toMatch(/^\d{6}$/);

    const verifyRes = await request(app)
      .post('/api/v1/users/verify-reset-otp')
      .send({ email: 'reset-flow@example.com', otp: stored.resetPasswordToken });
    expect(verifyRes.status).toBe(200);

    const resetRes = await request(app).post('/api/v1/users/reset-password').send({
      email: 'reset-flow@example.com',
      token: stored.resetPasswordToken,
      password: 'NewPassword2',
    });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'reset-flow@example.com', password: validUser.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'reset-flow@example.com', password: 'NewPassword2' });
    expect(newLogin.status).toBe(200);
  });

  it('should give the same generic response for a registered and an unregistered email (no enumeration)', async () => {
    await registerVerifiedUser({ email: 'reset-known@example.com' });
    const known = await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'reset-known@example.com' });
    const unknown = await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'reset-nobody@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('should reject a reset with the wrong/expired code', async () => {
    await registerVerifiedUser({ email: 'reset-badcode@example.com' });
    await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'reset-badcode@example.com' });

    const res = await request(app).post('/api/v1/users/reset-password').send({
      email: 'reset-badcode@example.com',
      token: '000000',
      password: 'NewPassword2',
    });
    expect(res.status).toBe(400);
  });

  it('should reject a new password under 8 characters', async () => {
    const reg = await registerVerifiedUser({ email: 'reset-weak@example.com' });
    await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'reset-weak@example.com' });
    const stored = await User.findById(reg.body._id).select('+resetPasswordToken');

    const res = await request(app).post('/api/v1/users/reset-password').send({
      email: 'reset-weak@example.com',
      token: stored.resetPasswordToken,
      password: 'short1',
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Role switching (M2)
// ─────────────────────────────────────────────────────────────────────
describe('POST /api/v1/users/switch-role', () => {
  it('should switch to a role the user holds and update activeRole', async () => {
    const { token, user } = await createConsumer();
    await User.findByIdAndUpdate(user._id, { $addToSet: { roles: 'business_owner' } });

    const res = await request(app)
      .post('/api/v1/users/switch-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'business_owner' });

    expect(res.status).toBe(200);
    expect(res.body.activeRole).toBe('business_owner');
    expect((await User.findById(user._id)).activeRole).toBe('business_owner');
  });

  it('should reject switching to a role the user does not hold', async () => {
    const { token } = await createConsumer();

    const res = await request(app)
      .post('/api/v1/users/switch-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
  });

  it('should reject an unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/users/switch-role').send({ role: 'consumer' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────
// PUT /profile/password strength rule unification (M3)
// ─────────────────────────────────────────────────────────────────────
describe('PUT /api/v1/users/profile/password', () => {
  const getOtp = async (token) => {
    const res = await request(app)
      .post('/api/v1/users/profile/password/request-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: validUser.password });
    expect(res.status).toBe(200);
    const decoded = require('jsonwebtoken').decode(token);
    const stored = await User.findById(decoded.id).select('+otpCode');
    return stored.otpCode;
  };

  it('should reject a new password under 8 characters (no more 6-char path)', async () => {
    const reg = await registerVerifiedUser({ email: 'changepw-weak@example.com' });
    const otp = await getOtp(reg.body.token);

    const res = await request(app)
      .put('/api/v1/users/profile/password')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ otp, newPassword: 'short1' });

    expect(res.status).toBe(400);
  });

  it('should reject a new password missing complexity (8+ chars but all lowercase)', async () => {
    const reg = await registerVerifiedUser({ email: 'changepw-nocomplex@example.com' });
    const otp = await getOtp(reg.body.token);

    const res = await request(app)
      .put('/api/v1/users/profile/password')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ otp, newPassword: 'alllowercase' });

    expect(res.status).toBe(400);
  });

  it('should accept a strong new password and let the user log in with it', async () => {
    const reg = await registerVerifiedUser({ email: 'changepw-strong@example.com' });
    const otp = await getOtp(reg.body.token);

    const res = await request(app)
      .put('/api/v1/users/profile/password')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ otp, newPassword: 'NewStrongPass2' });
    expect(res.status).toBe(200);

    const login = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'changepw-strong@example.com', password: 'NewStrongPass2' });
    expect(login.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Admin user management (M2) - includes a C1-payload regression test at
// this endpoint too, alongside the one already covering registration above.
// ─────────────────────────────────────────────────────────────────────
describe('Admin user management (GET /api/v1/users, PUT /api/v1/users/:id)', () => {
  it('should block a non-admin from listing users', async () => {
    const { token } = await createConsumer();
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should block a non-admin from updating another user (C1-style payload included)', async () => {
    const { token } = await createConsumer();
    const { user: target } = await createConsumer();

    const res = await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roles: ['admin'] });

    expect(res.status).toBe(403);
    expect((await User.findById(target._id)).roles).not.toContain('admin');
  });

  it('should let an admin list users', async () => {
    const { token } = await createAdmin();
    await createConsumer();

    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it('should let an admin update a user - status and roles', async () => {
    const { token } = await createAdmin();
    const { user: target } = await createConsumer();

    const res = await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'suspended', roles: ['consumer', 'rider'] });

    expect(res.status).toBe(200);
    const updated = await User.findById(target._id);
    expect(updated.status).toBe('suspended');
    expect(updated.roles).toEqual(expect.arrayContaining(['consumer', 'rider']));
  });

  it('should write an audit-log entry when an admin grants the admin role (M4)', async () => {
    const admin = await createAdmin();
    const { user: target } = await createConsumer();

    const res = await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['consumer', 'admin'] });
    expect(res.status).toBe(200);

    const entries = await AuditLog.find({ targetUser: target._id, action: 'grant_admin_role' });
    expect(entries).toHaveLength(1);
    expect(entries[0].actor.toString()).toBe(admin.user._id.toString());
    expect(entries[0].rolesBefore).toEqual(['consumer']);
    expect(entries[0].rolesAfter).toEqual(expect.arrayContaining(['consumer', 'admin']));
    expect(entries[0].createdAt).toBeTruthy();
  });

  it('should NOT write an audit-log entry for a role update that does not grant admin', async () => {
    const { token } = await createAdmin();
    const { user: target } = await createConsumer();

    await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roles: ['consumer', 'rider'] });

    const entries = await AuditLog.find({ targetUser: target._id });
    expect(entries).toHaveLength(0);
  });

  it('should NOT write a duplicate audit-log entry when re-saving an already-admin user', async () => {
    const admin = await createAdmin();
    const { user: target } = await createConsumer();
    await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['consumer', 'admin'] });

    // A second, unrelated update (still holding admin) must not log again.
    await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ firstName: 'Renamed' });

    const entries = await AuditLog.find({ targetUser: target._id });
    expect(entries).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Self-service account deletion (DELETE /api/v1/users/profile). The
// frontend has always called this exact path, but no route matched it -
// it silently fell through to the admin-only DELETE /:id route (with
// id="profile"), 403'ing every non-admin caller. This is the real
// self-delete endpoint that route was missing.
// ─────────────────────────────────────────────────────────────────────
describe('DELETE /api/v1/users/profile (self-service account deletion)', () => {
  it('should let a consumer delete their own account', async () => {
    const { token, user } = await createConsumer();

    const res = await request(app)
      .delete('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await User.findById(user._id)).toBeNull();
  });

  it('should let an admin delete their own account when other admins remain', async () => {
    const { token, user } = await createAdmin();
    await createAdmin();

    const res = await request(app)
      .delete('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await User.findById(user._id)).toBeNull();
  });

  it("should refuse to delete the platform's only remaining admin", async () => {
    const { token, user } = await createAdmin();

    const res = await request(app)
      .delete('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(await User.findById(user._id)).not.toBeNull();
  });

  it('should reject an unauthenticated delete request', async () => {
    const res = await request(app).delete('/api/v1/users/profile');
    expect(res.status).toBe(401);
  });

  it('should never route DELETE /api/v1/users/profile to the admin-only /:id handler', async () => {
    // Regression guard for the exact bug: a non-admin consumer must get
    // a real 200 here, not the admin-only route's 403.
    const { token } = await createConsumer();

    const res = await request(app)
      .delete('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).not.toBe(403);
  });
});
