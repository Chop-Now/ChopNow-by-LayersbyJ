/**
 * utils/authCookies.js unit tests
 *
 * Covers the environment-conditional cookie flags (H2): production must get
 * SameSite=None + Secure (frontend and backend are on different registrable
 * domains - Vercel vs Render - so this is genuinely cross-site and the cookie
 * won't be sent on fetch/XHR at all without it), while dev/test must NOT get
 * Secure (a Secure-flagged cookie is silently dropped by the browser over
 * plain HTTP, which is how local dev runs) and use SameSite=Lax instead.
 *
 * NODE_ENV is read once at module load, so each case re-requires the module
 * fresh via jest.resetModules() after setting NODE_ENV.
 */
const mockRes = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

describe('authCookies environment-conditional flags', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('should use SameSite=None + Secure in production', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    const { setAuthCookies } = require('../utils/authCookies');

    const res = mockRes();
    setAuthCookies(res, 'a-refresh-token');

    const [refreshCall, csrfCall] = res.cookie.mock.calls;
    expect(refreshCall[0]).toBe('refreshToken');
    expect(refreshCall[2]).toMatchObject({ secure: true, sameSite: 'none', httpOnly: true });
    expect(csrfCall[0]).toBe('csrfToken');
    expect(csrfCall[2]).toMatchObject({ secure: true, sameSite: 'none', httpOnly: false });
  });

  it('should use SameSite=Lax and secure:false outside production', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    const { setAuthCookies } = require('../utils/authCookies');

    const res = mockRes();
    setAuthCookies(res, 'a-refresh-token');

    const [refreshCall, csrfCall] = res.cookie.mock.calls;
    expect(refreshCall[2]).toMatchObject({ secure: false, sameSite: 'lax', httpOnly: true });
    expect(csrfCall[2]).toMatchObject({ secure: false, sameSite: 'lax', httpOnly: false });
  });

  it('should scope refreshToken to Path=/api and csrfToken to Path=/', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    const { setAuthCookies } = require('../utils/authCookies');

    const res = mockRes();
    setAuthCookies(res, 'a-refresh-token');

    const [refreshCall, csrfCall] = res.cookie.mock.calls;
    expect(refreshCall[2].path).toBe('/api');
    // csrfToken must be readable via document.cookie from any SPA route (none
    // of which are under /api), so it can't share refreshToken's narrower path.
    expect(csrfCall[2].path).toBe('/');
  });
});
