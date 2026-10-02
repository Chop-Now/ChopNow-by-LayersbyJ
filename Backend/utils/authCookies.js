/**
 * H2 fix: the refresh token now also travels as an httpOnly cookie (in addition
 * to the existing JSON response field, which Mobile still relies on via secure
 * device storage - see auth_service.dart). The web frontend stops persisting
 * tokens to localStorage and relies on this cookie for silent refresh instead.
 *
 * Frontend (Vercel) and backend (Render) are on different registrable domains,
 * so the cookie must be SameSite=None; Secure to be sent on cross-site
 * fetch/XHR calls at all. That in turn requires CSRF protection: a parallel,
 * JS-readable csrfToken cookie that the frontend must echo back as the
 * X-CSRF-Token header on every cookie-authenticated refresh request (double-
 * submit pattern) - see requireCsrfHeader below.
 */
const crypto = require('crypto');

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const CSRF_TOKEN_COOKIE = 'csrfToken';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// SameSite=None requires Secure, and a Secure cookie is only ever stored by a
// browser over an HTTPS connection - never over plain http://localhost. Local
// dev (frontend and backend both on localhost, different ports) is same-SITE
// by the cookie spec regardless of port, so SameSite=Lax + secure:false works
// there and the browser actually stores the cookie; production (Vercel
// frontend, Render backend - different registrable domains, both HTTPS) is
// genuinely cross-site and needs SameSite=None + Secure.
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/api',
  maxAge: SEVEN_DAYS_MS,
};

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sets the httpOnly refresh-token cookie and the paired, JS-readable CSRF
 * cookie. Returns the csrf token so callers can also include it in the JSON
 * body (convenient for clients that read it once at login rather than
 * parsing document.cookie).
 *
 * The two cookies deliberately have different Path scopes:
 *  - refreshToken stays at Path=/api: the browser attaches a cookie to a
 *    request based on the REQUEST's path, not the page you're on, so this
 *    correctly limits it to /api/* calls no matter what route the SPA is
 *    currently rendering.
 *  - csrfToken must be Path=/ (the whole site): document.cookie only exposes
 *    a cookie to script running on a page whose path is under the cookie's
 *    Path, and the SPA's own pages (/, /shop, /login, ...) are never under
 *    /api - so a csrfToken scoped to /api would be stored and sent correctly
 *    on requests, but silently unreadable by the frontend JS that needs to
 *    echo it back as the X-CSRF-Token header, permanently failing every
 *    refresh with a false CSRF rejection.
 */
function setAuthCookies(res, refreshToken) {
  const csrfToken = generateCsrfToken();
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
  res.cookie(CSRF_TOKEN_COOKIE, csrfToken, { ...cookieOptions, httpOnly: false, path: '/' });
  return csrfToken;
}

function clearAuthCookies(res) {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: cookieOptions.path });
  res.clearCookie(CSRF_TOKEN_COOKIE, { path: '/' });
}

/**
 * Double-submit CSRF check for cookie-authenticated refresh requests. Only
 * applies when the refresh token actually came from the cookie (a browser
 * attaching it automatically); a refresh token explicitly supplied in the
 * request body (Mobile) was not attached ambiently, so it isn't CSRF-exposed
 * and skips this check.
 */
function csrfHeaderMatchesCookie(req) {
  const cookieValue = req.cookies?.[CSRF_TOKEN_COOKIE];
  const headerValue = req.headers['x-csrf-token'];
  return Boolean(cookieValue) && cookieValue === headerValue;
}

module.exports = {
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  csrfHeaderMatchesCookie,
};
