/**
 * Google Sign-In (H5) tests
 *
 * Covers: POST /api/v1/users/google-login
 *
 * The fix under test is that the backend verifies the ID token's signature,
 * issuer, expiry, AND audience (must match our own GOOGLE_CLIENT_ID) via
 * OAuth2Client#verifyIdToken, rather than trusting a bare access token that
 * could have been minted for a completely different Google OAuth client.
 * google-auth-library is mocked here so no real network call to Google is made.
 */
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const request = require('supertest');
const app = require('./app');

const VALID_PAYLOAD = {
  sub: 'google-user-123',
  email: 'googleuser@example.com',
  given_name: 'Google',
  family_name: 'User',
  picture: 'https://example.com/avatar.png',
  email_verified: true,
  aud: process.env.JWT_SECRET, // irrelevant here; verifyIdToken is mocked, not really checking aud itself
};

beforeEach(() => {
  mockVerifyIdToken.mockReset();
});

describe('POST /api/v1/users/google-login', () => {
  it('should reject when idToken is missing', async () => {
    const res = await request(app).post('/api/v1/users/google-login').send({});

    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('should reject an ID token that fails verification (e.g. wrong audience)', async () => {
    mockVerifyIdToken.mockRejectedValue(
      new Error('Wrong recipient, payload audience != requiredAudience')
    );

    const res = await request(app)
      .post('/api/v1/users/google-login')
      .send({ idToken: 'a-token-minted-for-a-different-client' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
    expect(res.body).not.toHaveProperty('token');
  });

  it('should call verifyIdToken with our own GOOGLE_CLIENT_ID as the required audience', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => VALID_PAYLOAD });

    await request(app)
      .post('/api/v1/users/google-login')
      .send({ idToken: 'a-valid-token-for-our-client' });

    expect(mockVerifyIdToken).toHaveBeenCalledWith(
      expect.objectContaining({
        idToken: 'a-valid-token-for-our-client',
        audience: process.env.GOOGLE_CLIENT_ID,
      })
    );
  });

  it('should log the user in and issue tokens when the ID token verifies successfully', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => VALID_PAYLOAD });

    const res = await request(app)
      .post('/api/v1/users/google-login')
      .send({ idToken: 'a-valid-token-for-our-client' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('email', VALID_PAYLOAD.email);
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});
