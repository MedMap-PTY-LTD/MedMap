// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './utils/patchResizeObserver';
import './utils/suppressResizeObserverError';

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