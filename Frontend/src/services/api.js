import axios from 'axios';
import toast from 'react-hot-toast';

// Both dev (Vite's own dev-server proxy, see vite.config.js) and production
// (Vercel's /api rewrite, see vercel.json) forward API calls as same-origin
// relative requests, so the refresh-token/CSRF cookies stay first-party
// instead of cross-site. Talking to the backend's absolute URL directly (as
// this used to do in production) makes the browser treat those cookies as
// third-party and silently refuse to store them at all on Safari and an
// increasing share of Chrome - found live during the 2026-09-26 E2E pass,
// where it silently logged every user out on every page reload. Never revert
// this to an absolute URL.
const API_URL = '';

// The backend's real absolute origin - still needed for the Socket.IO
// connection, since a WebSocket upgrade isn't something the /api rewrite
// above proxies. Dev relies on Vite's own /socket.io proxy instead, so this
// is production-only (see services/socket.js).
export const BACKEND_ORIGIN = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_URL || 'http://localhost:5000';

// H2 fix: the refresh token now lives only in an httpOnly cookie the backend
// sets (never reachable from JS - that's the point). The access token is kept
// here, in a module-scoped variable, instead of localStorage: it survives for
// the life of the tab but is wiped on reload, same as it would be if XSS'd -
// an attacker who can run JS on the page can still call authenticated
// endpoints while the tab is open (unavoidable for a UI that authenticates at
// all), but can no longer exfiltrate a long-lived credential for offline use.
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => {
  accessToken = null;
};

// The CSRF cookie is deliberately NOT httpOnly (see Backend/utils/authCookies.js)
// so it can be read here and echoed back as a header - the double-submit check.
const getCsrfTokenFromCookie = () => {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15s — fail fast instead of hanging for 60s+ on cold-start servers
  headers: {
    'Content-Type': 'application/json',
  },
  // Required so the browser attaches the httpOnly refresh-token cookie to
  // cross-site requests (frontend and backend are on different domains).
  withCredentials: true,
});

// Track whether a token refresh is in progress to avoid duplicate refresh calls
let isRefreshing = false;
// Queue of failed requests waiting for token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Force logout: clear all auth state and redirect
const forceLogout = () => {
  clearAccessToken();
  localStorage.removeItem('user');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

// Request interceptor to add the access token and (when present) the CSRF
// double-submit header. The csrfToken cookie only exists once a refresh-token
// cookie has been set (login/register/refresh), so this is a no-op otherwise;
// harmless to send on every request since only /refresh-token checks it.
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and refresh tokens
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Check if this request should suppress toast notifications
    const silentMode = originalRequest?.silent === true;

    if (error.response) {
      const { status, data } = error.response;

      // Handle 401: attempt token refresh before giving up
      if (status === 401 && !originalRequest._retry) {
        // Don't retry refresh-token requests themselves
        if (originalRequest.url?.includes('/refresh-token')) {
          forceLogout();
          return Promise.reject(error);
        }

        // If a refresh is already in progress, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        // No local refresh-token check needed: it lives in the httpOnly cookie,
        // which the browser attaches automatically (withCredentials: true).
        // The backend tells us with 400 if there's genuinely no session.
        try {
          const { data: refreshData } = await axios.post(
            `${API_URL}/api/users/refresh-token`,
            {},
            {
              withCredentials: true,
              headers: { 'X-CSRF-Token': getCsrfTokenFromCookie() },
            }
          );
          const newToken = refreshData.token;
          setAccessToken(newToken);

          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          processQueue(null, newToken);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          forceLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle other error statuses
      switch (status) {
        case 403:
          // EMAIL_NOT_VERIFIED is handled by the login page with its own
          // message and resend action.
          if (!silentMode && data?.code !== 'EMAIL_NOT_VERIFIED') {
            toast.error('You do not have permission to perform this action.');
          }
          break;
        case 404:
          if (!silentMode) toast.error(data.message || 'Resource not found.');
          break;
        case 500:
          if (!silentMode) toast.error('Server error. Please try again later.');
          break;
        default:
          if (status !== 401 && !silentMode) toast.error(data.message || 'An error occurred.');
      }
    } else if (error.request) {
      // Request made but no response received
      if (!silentMode) toast.error('Unable to connect to server. Please check your connection.');
    } else {
      // Something else happened
      if (!silentMode) toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
