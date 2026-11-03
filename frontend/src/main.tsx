// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './utils/patchResizeObserver';
import './utils/suppressResizeObserverError';
import { VITE_PRELOAD_RETRY_KEY } from './utils/preloadRecovery';

// A deployment can replace a lazy-loaded page chunk while a patient is using
// an older copy of the app. Vite reports that as `vite:preloadError`; reload
// once so the browser fetches the current entry point and chunk URLs. The
// session guard prevents a persistent network failure from causing a reload
// loop.
window.addEventListener('vite:preloadError', (event) => {
  let previousRetryAt = 0;
  try {
    previousRetryAt = Number(window.sessionStorage.getItem(VITE_PRELOAD_RETRY_KEY)) || 0;
  } catch {
    // Storage can be unavailable in restricted browsing contexts. Leave the
    // error to React's normal error boundary in that case.
    return;
  }

  const now = Date.now();
  if (now - previousRetryAt < 30_000) return;

  try {
    window.sessionStorage.setItem(VITE_PRELOAD_RETRY_KEY, String(now));
  } catch {
    return;
  }

  event.preventDefault();
  window.location.reload();
});

// Initialize Sentry - this will only load if VITE_SENTRY_DSN is set
import './integrations/sentry';

import App from './App.tsx';
import './index.css';

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('💥 Uncaught error:', event.error || event.message);
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled rejection:', event.reason);
});

// Performance measurement (optional)
if (import.meta.env.PROD) {
  // Report Web Vitals
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    const reportWebVital = (metric: any) => {
      console.log(`📊 Web Vital - ${metric.name}: ${metric.value}`);
      // You can send this to your analytics/Sentry
      // Sentry.metrics?.distribution(metric.name, metric.value);
    };
    
    onCLS(reportWebVital);
    onFID(reportWebVital);
    onFCP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
  });
}

// Render the app
const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
