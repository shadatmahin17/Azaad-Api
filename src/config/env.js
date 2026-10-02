/**
 * Centralized Environment Configuration
 * Reads all sensitive keys, Firebase credentials, and branding URLs from .env (import.meta.env)
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const APP_NAME = env.VITE_APP_NAME || 'Azaad Music';
export const APP_LOGO_URL = env.VITE_APP_LOGO_URL || '/img/Logo.png';
export const APP_FAVICON_URL = env.VITE_APP_FAVICON_URL || '/img/favicon.png';
export const APP_BG_URL =
  env.VITE_APP_BG_URL || 'https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/Background.jpg';
export const AUDIUS_APP_NAME = env.VITE_AUDIUS_APP_NAME || 'AZAAD_MUSIC_PLAYER';

if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--app-bg-url', `url("${APP_BG_URL}")`);
  document
    .querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((el) => el.setAttribute('href', APP_FAVICON_URL));
}

export const FIREBASE_CONFIG = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
  recaptchaSiteKey: env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || '',
};
