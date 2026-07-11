// src/utils/security.js - KAYAD FRONTEND SECURITY UTILITIES

export const VALIDATION_PATTERNS = {
  phone: /^(\+254|254|0)[17][0-9]{8}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

export const VALIDATION_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 255 },
  phone: { min: 10, max: 15 },
  password: { min: 8, max: 128 },
};

export function validateEmail(email) {
  if (!email) return { valid: false, error: 'Email is required' };
  const str = String(email).trim();
  if (str.length > 255) return { valid: false, error: 'Email too long' };
  if (!VALIDATION_PATTERNS.email.test(str)) return { valid: false, error: 'Invalid email format' };
  return { valid: true, value: str };
}

export function validatePhone(phone) {
  if (!phone) return { valid: false, error: 'Phone is required' };
  let normalized = phone.replace(/[\s-]/g, '');
  if (normalized.startsWith('0')) normalized = '+254' + normalized.slice(1);
  if (normalized.startsWith('254') && !normalized.startsWith('+254')) normalized = '+' + normalized;
  if (!VALIDATION_PATTERNS.phone.test(normalized)) return { valid: false, error: 'Invalid Kenyan phone' };
  return { valid: true, value: normalized };
}

export function sanitizeHTML(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&#x2F;');
}

export function sanitizeQueryObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (key.startsWith('$')) continue;
    if (key.includes('.')) continue;
    const value = obj[key];
    sanitized[key] = typeof value === 'string' ? value.replace(/[\$\.]/g, '').trim() : typeof value === 'object' ? sanitizeQueryObject(value) : value;
  }
  return sanitized;
}

export function isSafeURL(url) {
  if (!url || typeof url !== 'string') return false;
  const lowered = url.toLowerCase();
  if (lowered.startsWith('javascript:') || lowered.startsWith('data:') || lowered.startsWith('vbscript:')) return false;
  if (!/^https?:\/\//.test(lowered)) return false;
  return true;
}

export const UPLOAD_LIMITS = {
  image: { maxSize: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  video: { maxSize: 50 * 1024 * 1024, types: ['video/mp4', 'video/webm'] },
};

export function validateFile(file, type = 'image') {
  const limits = UPLOAD_LIMITS[type] || UPLOAD_LIMITS.image;
  if (!file) return { valid: false, error: 'No file' };
  if (!limits.types.includes(file.type)) return { valid: false, error: 'File type not allowed' };
  if (file.size > limits.maxSize) return { valid: false, error: 'File too large' };
  return { valid: true };
}

export function getSecurityHeaders() {
  return {
    'X-Requested-With': 'XMLHttpRequest',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  };
}

export function getCSRFToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const SESSION_TIMEOUT = 30 * 60 * 1000;
export const SESSION_WARNING = 5 * 60 * 1000;

export function initSessionMonitor(onWarning, onTimeout) {
  let sessionTimer = null;
  let warningTimer = null;
  const resetTimers = () => {
    clearTimeout(sessionTimer);
    clearTimeout(warningTimer);
    warningTimer = setTimeout(() => onWarning?.(), SESSION_TIMEOUT - SESSION_WARNING);
    sessionTimer = setTimeout(() => onTimeout?.(), SESSION_TIMEOUT);
  };
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(e => document.addEventListener(e, resetTimers, { passive: true }));
  resetTimers();
  return () => {
    clearTimeout(sessionTimer);
    clearTimeout(warningTimer);
    events.forEach(e => document.removeEventListener(e, resetTimers));
  };
}

export const SecurityEvents = {
  LOGIN_SUCCESS: 'auth:login_success',
  LOGIN_FAILED: 'auth:login_failed',
  LOGOUT: 'auth:logout',
  SESSION_EXPIRED: 'auth:session_expired',
  PERMISSION_DENIED: 'auth:permission_denied',
};

export function logSecurityEvent(event, metadata = {}) {
  if (import.meta.env.PROD) console.warn('[SECURITY]', event, metadata);
  else console.log('[SECURITY DEV]', event, metadata);
}

export default {
  VALIDATION_PATTERNS, VALIDATION_LIMITS,
  validateEmail, validatePhone,
  sanitizeHTML, sanitizeQueryObject, isSafeURL,
  validateFile, UPLOAD_LIMITS,
  getSecurityHeaders, getCSRFToken,
  initSessionMonitor, SESSION_TIMEOUT, SESSION_WARNING,
  SecurityEvents, logSecurityEvent,
};
