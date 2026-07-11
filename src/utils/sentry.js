// src/utils/sentry.js — stub (Sentry not configured)
export const initSentry = () => {};
export const setSentryUser = () => {};
export const clearSentryUser = () => {};
export const reportError = (err) => { if (import.meta.env.DEV) console.error('[Error]', err); };
export const isSentryInitialized = () => false;
