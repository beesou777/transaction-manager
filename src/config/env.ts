/**
 * Environment Configuration
 * 
 * Access environment variables here with proper typing and defaults
 */

// Development mode
export const IS_DEV = process.env.NODE_ENV === 'development';

// Debug mode (can be controlled via env var)
export const DEBUG_MODE = process.env.EXPO_PUBLIC_DEBUG_MODE === 'true' || IS_DEV;

// EAS Project ID
export const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'your-project-id';

// Future: Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Future: Firebase Configuration
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Future: Feature Flags
export const FEATURE_FLAGS = {
  cloudSync: process.env.EXPO_PUBLIC_ENABLE_CLOUD_SYNC === 'true',
  aiCategorization: process.env.EXPO_PUBLIC_ENABLE_AI_CATEGORIZATION === 'true',
  smsDetection: process.env.EXPO_PUBLIC_ENABLE_SMS_DETECTION !== 'false', // Default true
};

// Future: API Keys
export const API_KEYS = {
  bankApiKey: process.env.EXPO_PUBLIC_BANK_API_KEY || '',
  bankApiUrl: process.env.EXPO_PUBLIC_BANK_API_URL || '',
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  paypalClientId: process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID || '',
};

// Future: Analytics & Monitoring
export const MONITORING = {
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY || '',
};

/**
 * Validate required environment variables
 * Call this at app startup
 */
export const validateEnv = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Add validation for required vars here
  // Example:
  // if (!SUPABASE_URL && FEATURE_FLAGS.cloudSync) {
  //   errors.push('EXPO_PUBLIC_SUPABASE_URL is required when cloud sync is enabled');
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
};
