import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // H2 fix companion: the backend now sets the refresh-token session as a
      // cookie, and browsers treat each localhost:<port> as its own "site"
      // (no real eTLD+1 to key off), so a plain cross-port dev setup can't
      // store it without SameSite=None; Secure (i.e. HTTPS). Proxying /api and
      // /socket.io through Vite's own dev server makes the browser see a
      // single origin, so the (dev-only) SameSite=Lax cookie from
      // Backend/utils/authCookies.js is stored like any same-site cookie -
      // matching how the built production app talks to the real API domain
      // directly (no proxy exists outside `vite dev`).
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true },
        '/socket.io': { target: backendTarget, changeOrigin: true, ws: true },
      },
    },
  };
});
