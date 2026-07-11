// backend/config/security.js
// Security configuration constants and defaults

export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    BANNED_PASSWORDS: [
      "password", "12345678", "123456789", "qwerty", "abc123",
      "password123", "admin123", "letmein", "welcome", "monkey",
      "1234567890", "password1", "1234567", "12345", "iloveyou",
    ],
    BANNED_EMAIL_PATTERNS: [], // Add email patterns to ban
  },

  // JWT configuration
  JWT: {
    ALGORITHM: "HS256",
    EXPIRY: "7d",
    REFRESH_EXPIRY: "30d",
    ISSUER: "kayad-api",
    AUDIENCE: "kayad-app",
    // Token version for invalidation
    INCREMENT_ON_LOGOUT: true,
    INCREMENT_ON_PASSWORD_CHANGE: true,
  },

  // Rate limiting
  RATE_LIMIT: {
    GLOBAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX: 500,
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX: 20,
    },
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX: 5,
      LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
      MAX_ATTEMPTS: 5,
    },
    BID: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX: 10,
    },
    PAYMENT: {
      WINDOW_MS: 60 * 1000,
      MAX: 5,
    },
    API: {
      WINDOW_MS: 60 * 1000,
      MAX: 100,
    },
  },

  // Session configuration
  SESSION: {
    MAX_PER_USER: 5,
    TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    ABSOLUTE_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
    SECURE_COOKIE: process.env.NODE_ENV === "production",
    HTTP_ONLY: true,
    SAME_SITE: "strict",
  },

  // Upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES: 10,
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
    ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
  },

  // CORS configuration
  CORS: {
    ALLOWED_METHODS: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    ALLOWED_HEADERS: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "X-XSRF-Token",
      "X-Request-ID",
    ],
    MAX_AGE: 600, // 10 minutes
  },

  // Security headers
  HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 year
    HSTS_INCLUDE_SUBDOMAINS: true,
    HSTS_PRELOAD: true,
    FRAME_OPTIONS: "DENY",
    CONTENT_TYPE_OPTIONS: "nosniff",
    REFERRER_POLICY: "strict-origin-when-cross-origin",
    PERMITTED_POLICIES: "none",
  },

  // API configuration
  API: {
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_QUERY_LIMIT: 100,
    DEFAULT_QUERY_LIMIT: 20,
    MAX_BODY_SIZE: 2 * 1024 * 1024, // 2MB
  },

  // Audit logging
  AUDIT: {
    ENABLED: true,
    LOG_AUTH_EVENTS: true,
    LOG_ADMIN_EVENTS: true,
    LOG_PAYMENT_EVENTS: true,
    LOG_SENSITIVE_ACCESS: true,
    RETENTION_DAYS: 90,
  },

  // IP allowlisting (for admin operations)
  IP_ALLOWLIST: {
    ENABLED: false, // Set to true and configure IPs for extra security
    WHITELIST: [], // Add IP addresses
    BLACKLIST: [], // Block specific IPs
  },

  // Feature flags
  FEATURES: {
    OTP_2FA: false, // Enable when ready
    IP_TRACKING: true,
    SUSPICIOUS_ACTIVITY_ALERTS: true,
    CONCURRENT_SESSION_LIMIT: true,
    PASSWORD_HISTORY: true,
    SECURITY_QUESTIONS: false,
  },
};

// Sensitive fields that should never be logged
export const SENSITIVE_FIELDS = [
  "password",
  "currentPassword",
  "newPassword",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "privateKey",
  "sessionToken",
  "csrfToken",
  "otp",
  "verificationCode",
  "authorization",
  "cookie",
  "x-api-key",
];

// Fields to mask in logs
export const MASKED_FIELDS = [
  "email",
  "phone",
  "name",
  "address",
];

// Roles and their base permissions
export const ROLE_PERMISSIONS = {
  guest: [],
  user: [
    "read:own_profile",
    "update:own_profile",
    "read:cars",
    "create:bids",
    "read:own_bids",
    "create:reviews",
    "read:own_reviews",
  ],
  individual_seller: [
    "read:own_profile",
    "update:own_profile",
    "create:cars",
    "update:own_cars",
    "delete:own_cars",
    "read:cars",
    "create:bids",
    "read:own_bids",
    "create:reviews",
    "read:own_reviews",
  ],
  dealer: [
    "read:own_profile",
    "update:own_profile",
    "create:cars",
    "update:own_cars",
    "delete:own_cars",
    "read:cars",
    "create:bids",
    "read:own_bids",
    "create:reviews",
    "read:own_reviews",
    "read:own_analytics",
    "manage:own_escrows",
  ],
  ghost_checker: [
    "read:cars",
    "create:inspections",
    "update:own_inspections",
    "read:own_inspections",
  ],
  moderator: [
    "read:cars",
    "update:cars",
    "delete:cars",
    "create:reviews",
    "update:reviews",
    "delete:reviews",
    "read:disputes",
  ],
  ad_manager: [
    "manage:ads",
    "read:ads_analytics",
  ],
  marketing: [
    "create:announcements",
    "read:announcements",
  ],
  escrow_officer: [
    "read:escrows",
    "update:escrows",
    "manage:escrows",
  ],
  technical_support: [
    "read:users",
    "update:users",
    "read:tickets",
    "update:tickets",
    "read:disputes",
  ],
  hr: [
    "read:users",
    "update:users",
    "create:staff",
  ],
  accounts: [
    "read:payments",
    "read:escrows",
    "read:analytics",
  ],
  admin: [
    "read:users",
    "update:users",
    "delete:users",
    "manage:users",
    "read:cars",
    "update:cars",
    "delete:cars",
    "manage:cars",
    "read:payments",
    "manage:payments",
    "read:escrows",
    "manage:escrows",
    "read:disputes",
    "manage:disputes",
    "read:inspections",
    "manage:inspections",
    "read:analytics",
    "manage:settings",
    "manage:ads",
    "read:ads",
    "manage:announcements",
    "read:announcements",
  ],
  superadmin: [
    "*", // All permissions
  ],
};

// Permission definitions
export const PERMISSIONS = {
  // User management
  "read:users": "Read user information",
  "update:users": "Update user information",
  "delete:users": "Delete users",
  "manage:users": "Full user management",
  
  // Car management
  "read:cars": "View cars",
  "create:cars": "Create car listings",
  "update:cars": "Update car listings",
  "delete:cars": "Delete car listings",
  "manage:cars": "Full car management",
  
  // Bidding
  "create:bids": "Place bids",
  "read:own_bids": "View own bids",
  "read:bids": "View all bids",
  
  // Reviews
  "create:reviews": "Create reviews",
  "read:reviews": "View reviews",
  "update:reviews": "Update reviews",
  "delete:reviews": "Delete reviews",
  
  // Payments
  "read:payments": "View payment information",
  "manage:payments": "Manage payments",
  
  // Escrow
  "read:escrows": "View escrow information",
  "manage:escrows": "Manage escrows",
  
  // Inspections
  "create:inspections": "Create inspections",
  "read:inspections": "View inspections",
  "update:inspections": "Update inspections",
  "manage:inspections": "Manage inspections",
  
  // Disputes
  "read:disputes": "View disputes",
  "manage:disputes": "Manage disputes",
  
  // Settings
  "read:settings": "View settings",
  "manage:settings": "Manage settings",
  
  // Analytics
  "read:analytics": "View analytics",
  "read:own_analytics": "View own analytics",
  
  // Ads
  "manage:ads": "Manage advertisements",
  "read:ads": "View advertisements",
  "read:ads_analytics": "View ad analytics",
  
  // Announcements
  "manage:announcements": "Manage announcements",
  "read:announcements": "View announcements",
  
  // Own resource access
  "read:own_profile": "View own profile",
  "update:own_profile": "Update own profile",
  "read:own_cars": "View own car listings",
  "update:own_cars": "Update own car listings",
  "delete:own_cars": "Delete own car listings",
  "read:own_reviews": "View own reviews",
  "read:own_inspections": "View own inspections",
};

// Security event types for audit logging
export const SECURITY_EVENTS = {
  // Authentication
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_LOGOUT: "auth.logout",
  AUTH_TOKEN_REFRESH: "auth.token_refresh",
  AUTH_PASSWORD_CHANGE: "auth.password_change",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  
  // Authorization
  AUTHZ_DENIED: "authz.denied",
  
  // Admin actions
  ADMIN_USER_CREATE: "admin.user_create",
  ADMIN_USER_UPDATE: "admin.user_update",
  ADMIN_USER_DELETE: "admin.user_delete",
  ADMIN_USER_BAN: "admin.user_ban",
  ADMIN_ROLE_CHANGE: "admin.role_change",
  ADMIN_SETTINGS_CHANGE: "admin.settings_change",
  
  // Payment actions
  PAYMENT_INITIATE: "payment.initiate",
  PAYMENT_COMPLETE: "payment.complete",
  PAYMENT_FAIL: "payment.fail",
  PAYMENT_REFUND: "payment.refund",
  ESCROW_CREATE: "escrow.create",
  ESCROW_RELEASE: "escrow.release",
  ESCROW_REFUND: "escrow.refund",
  
  // Data operations
  DATA_EXPORT: "data.export",
  DATA_DELETE: "data.delete",
  DATA_BULK_DELETE: "data.bulk_delete",
};

// Severity levels
export const SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export default SECURITY_CONFIG;
