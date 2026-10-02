import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import AppContextProvider from './context/AppContext';
import { PlatformSettingsProvider } from './context/PlatformSettingsContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorBoundary from './Components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <PlatformSettingsProvider>
            <AppContextProvider>
              <App />
            </AppContextProvider>
          </PlatformSettingsProvider>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </HelmetProvider>
);
