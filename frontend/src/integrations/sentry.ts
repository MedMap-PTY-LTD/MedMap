// frontend/src/integrations/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Get DSN from environment variables
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Only initialize if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    
    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Trace all page loads and navigation
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/yourdomain\.com/,
        ],
        // Sample rate for performance traces (0-1)
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
        // Max number of breadcrumbs to keep
        maxBreadcrumbs: 50,
      }),
    ],

    // Sample rate for errors (always 1.0 in production)
    sampleRate: 1.0,

    // Before sending event - allow filtering
    beforeSend(event) {
      // Don't send events in development
      if (ENVIRONMENT === 'development') {
        return null;
      }

      // Don't send if it's a known bot or crawler
      const userAgent = navigator.userAgent || '';
      if (/bot|crawler|spider|scraper/i.test(userAgent)) {
        return null;
      }

      // Remove sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Remove sensitive user data
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }

      return event;
    },

    // Ignore certain errors (common noise)
    ignoreErrors: [
      /ResizeObserver loop/,
      /Script error/,
      /NetworkError/,
      /Failed to fetch/,
      /AbortError/,
      /Loading chunk \d+ failed/,
      /ChunkLoadError/,
    ],

    // Enable Replay for better debugging (optional - requires extra setup)
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,
  });

  console.log('✅ Sentry initialized successfully!');
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log(`   Release: ${RELEASE}`);
} else {
  console.log('ℹ️ VITE_SENTRY_DSN not found - Sentry disabled');
  console.log('   To enable Sentry, add VITE_SENTRY_DSN to your .env file');
}

// Export Sentry instance
export default Sentry;

// ==================== HELPER FUNCTIONS ====================

// Set user context (call after authentication)
export const setSentryUser = (user: { id: string; email?: string; username?: string }) => {
  if (SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
};

// Clear user context (on logout)
export const clearSentryUser = () => {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
};

// Add custom context (for debugging)
export const setSentryContext = (key: string, context: Record<string, any>) => {
  if (SENTRY_DSN) {
    Sentry.setContext(key, context);
  }
};

// Add custom tags (for filtering)
export const setSentryTag = (key: string, value: string) => {
  if (SENTRY_DSN) {
    Sentry.setTag(key, value);
  }
};

// Manually capture an error
export const captureSentryError = (error: Error, context?: Record<string, any>) => {
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
  } else {
    console.error('📝 Error (Sentry disabled):', error, context);
  }
};

// Manually capture a message
export const captureSentryMessage = (
  message: string, 
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) => {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      contexts: context ? { custom: context } : undefined,
    });
  } else {
    console.log(`📝 Message (Sentry disabled): [${level}] ${message}`, context);
  }
};

// Add breadcrumb (for tracking user actions)
export const addSentryBreadcrumb = (
  message: string,
  category?: string,
  data?: Record<string, any>
) => {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category: category || 'user.action',
      data,
      level: 'info',
    });
  }
};