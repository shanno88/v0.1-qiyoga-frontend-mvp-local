/**
 * Paddle Configuration
 * Manages sandbox vs live environment switching
 */

export const PRICE_ID = import.meta.env.VITE_PADDLE_LIVE_PRICE_ID;

// Environment detection
const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || getAutoDetectedEnvironment();

// Token configuration
const PADDLE_CONFIG = {
  sandbox: {
    token: import.meta.env.VITE_PADDLE_SANDBOX_TOKEN || '',
  },
  live: {
    token: import.meta.env.VITE_PADDLE_LIVE_TOKEN || 'live_c93653afe91caaa9f5ad6a0d4da',
  }
};

/**
 * Get current environment config (sandbox or live)
 */
export function getPaddleConfig() {
  if (PADDLE_ENV === 'sandbox') {
    return PADDLE_CONFIG.sandbox;
  }

  return PADDLE_CONFIG.live;
}

/**
 * Initialize Paddle SDK with correct environment settings
 */
export function initPaddle() {
  if (typeof window === 'undefined' || !window.Paddle) {
    console.warn('Paddle SDK not loaded');
    return;
  }

  const config = getPaddleConfig();
  const environment = PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production';

  console.log(`Initializing Paddle in ${environment} mode`);
  console.log(`Token: ${config.token.substring(0, 10)}...`);
  console.log(`Price ID: ${PRICE_ID}`);

  window.Paddle.Initialize({
    token: config.token
  });
}

/**
 * Get current price ID based on environment
 */
export function getCurrentPriceId(): string {
  return PRICE_ID;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return PADDLE_ENV !== 'sandbox';
}

/**
 * Check if running in localhost
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '0.0.0.0';
}

/**
 * Auto-detect environment based on hostname
 * Override with VITE_PADDLE_ENV if set
 */
export function getAutoDetectedEnvironment(): 'sandbox' | 'production' {
  // Auto-detect based on hostname
  if (isLocalhost()) {
    return 'sandbox';
  }

  return 'production';
}
