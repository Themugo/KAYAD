// backend/middleware/securityHeaders.js
// Enhanced security headers and protections beyond helmet

import helmet from "helmet";
import crypto from "crypto";

// Content Security Policy - strict but functional
const getCSP = () => {
  const policy = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "block-all-mixed-content": [],
    "font-src": ["'self'", "https:", "data:"],
    "frame-ancestors": ["'none'"],
    "img-src": ["'self'", "data:", "https:", "blob:"],
    "object-src": ["'none'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
    "style-src": ["'self'", "'unsafe-inline'", "https:"],
    "connect-src": ["'self'", "wss:", "https:"],
    "frame-src": ["'none'"],
    "media-src": ["'self'", "data:", "https:", "blob:"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
  
  // Add reporting endpoint in production
  if (process.env.NODE_ENV === "production") {
    policy["report-uri"] = ["/api/security/csp-violation"];
    policy["report-to"] = ["csp-endpoints"];
  }
  
  return policy;
};

// HSTS configuration
const getHSTS = () => ({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
});

// Referrer Policy options
const referrerPolicy = "strict-origin-when-cross-origin";

// Permissions Policy (formerly Feature Policy)
const permissionsPolicy = {
  accelerometer: ["none"],
  autoplay: ["none"],
  camera: ["none"],
  "cross-origin-isolated": [],
  "document-domain": ["none"],
  encrypted-media: ["none"],
  fullscreen: ["self"],
  geolocation: ["none"],
  gyroscope: ["none"],
  "interest-cohort": ["none"],
  magnetometer: ["none"],
  microphone: ["none"],
  midi: ["none"],
  "payment": ["none"],
  picture-in-picture: ["none"],
  screen-wake-lock: ["none"],
  sync-xhr: ["none"],
  usb: ["none"],
  web-share: ["none"],
  xrspatial-tracking: ["none"],
};

export const securityHeaders = () => [
  // 1. Helmet with enhanced configuration
  helmet({
    contentSecurityPolicy: {
      directives: getCSP(),
      reportOnly: process.env.NODE_ENV !== "production", // Report only in non-production
    },
    hsts: getHSTS(),
    referrerPolicy: { policy: referrerPolicy },
    permissionsPolicy: { features: permissionsPolicy },
    
    // Disable certain helmet features that might interfere with functionality
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    
    // X-Frame-Options is handled separately
    frameguard: { action: "deny" },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection (deprecated but still sent for older browsers)
    xssFilter: true,
  }),
  
  // 2. Additional custom security headers
  (req, res, next) => {
    // Remove headers that reveal server information
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server"); // Let helmet handle this
    
    // X-Request-ID for request tracing
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    res.setHeader("X-Request-ID", requestId);
    req.requestId = requestId;
    
    // X-Response-Time for performance monitoring
    const startTime = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      res.setHeader("X-Response-Time", `${duration}ms`);
    });
    
    // Cache control for sensitive endpoints
    if (req.path.includes("/auth/") || req.path.includes("/admin/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    
    // Strict Transport Security upgrade for insecure requests
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      res.setHeader("Strict-Transport-Security", `max-age=31536000; includeSubDomains; preload`);
    }
    
    // Content-Type options
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Download options - prevent MIME sniffing for downloads
    res.setHeader("X-Download-Options", "noopen");
    
    // X-Permitted-Cross-Domain-Policies
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    
    // DNS Prefetch Control
    res.setHeader("X-DNS-Prefetch-Control", "off");
    
    // Expect-CT (Certificate Transparency)
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Expect-CT", "max-age=86400, enforce, report-uri=/api/security/ct-violation");
    }
    
    // Timing-Allow-Origin - restrict timing information
    res.setHeader("Timing-Allow-Origin", process.env.FRONTEND_URL || "'self'");
    
    next();
  },
];

// Content-Type validation middleware
export const validateContentType = (allowedTypes = ["application/json"]) => {
  return (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }
    
    const contentType = req.headers["content-type"] || "";
    
    // Allow requests without content-type (some API clients don't send it)
    if (!contentType) {
      logSecurityWarning(req, "MISSING_CONTENT_TYPE", {
        path: req.path,
        method: req.method,
      });
      // Still allow it but log it
      return next();
    }
    
    // Check if content type matches allowed types
    const isAllowed = allowedTypes.some((type) => contentType.includes(type));
    
    if (!isAllowed) {
      logSecurityWarning(req, "INVALID_CONTENT_TYPE", {
        path: req.path,
        method: req.method,
        contentType,
      });
      
      return res.status(415).json({
        success: false,
        message: "Unsupported Media Type",
        details: `Content-Type must be one of: ${allowedTypes.join(", ")}`,
      });
    }
    
    next();
  };
};

// Request validation middleware
export const validateRequest = () => {
  return (req, res, next) => {
    // Validate Content-Length is within reasonable bounds
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxContentLength = parseInt(process.env.MAX_REQUEST_SIZE || "10485760"); // 10MB default
    
    if (contentLength > maxContentLength) {
      return res.status(413).json({
        success: false,
        message: "Payload Too Large",
        details: `Request body exceeds maximum size of ${maxContentLength} bytes`,
      });
    }
    
    // Check for suspiciously large requests
    if (contentLength > 1000000) { // 1MB
      logSecurityWarning(req, "LARGE_REQUEST", {
        path: req.path,
        contentLength,
      });
    }
    
    // Validate Accept header if present
    const accept = req.headers.accept;
    if (accept && !accept.includes("application/json") && !accept.includes("*/*")) {
      logSecurityWarning(req, "UNCOMMON_ACCEPT_HEADER", {
        path: req.path,
        accept,
      });
    }
    
    next();
  };
};

// Origin validation
export const validateOrigin = () => {
  return (req, res, next) => {
    // Skip for GET requests
    if (req.method === "GET") {
      return next();
    }
    
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // If we have an origin header, it should match allowed origins
    if (origin) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.SITE_URL,
      ].filter(Boolean);
      
      if (allowedOrigins.length > 0 && !allowedOrigins.some(allowed => 
        origin === allowed || origin === `${allowed}/`
      )) {
        logSecurityWarning(req, "SUSPICIOUS_ORIGIN", {
          origin,
          allowedOrigins,
        });
        
        // Don't block, just log for now
      }
    }
    
    // Validate Referer for sensitive operations
    if (req.path.includes("/auth/") || req.path.includes("/payment")) {
      if (!origin && !referer) {
        logSecurityWarning(req, "MISSING_ORIGIN_REFERER", {
          path: req.path,
        });
      }
    }
    
    next();
  };
};

// IP anonymization for logging
export function anonymizeIP(ip) {
  if (!ip) return "unknown";
  
  // IPv4 anonymization
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }
  
  // IPv6 anonymization
  if (ip.includes(":")) {
    return ip.substring(0, 7) + ":xxxx:xxxx:xxxx:xxxx";
  }
  
  return ip;
}

// Security warning logger
function logSecurityWarning(req, type, data) {
  const safeData = { ...data };
  
  // Remove sensitive fields
  delete safeData.password;
  delete safeData.token;
  delete safeData.authorization;
  delete safeData.cookie;
  
  console.warn(`[SECURITY-WARNING] ${type}:`, {
    ip: anonymizeIP(req.ip),
    path: req.path,
    method: req.method,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
    ...safeData,
  });
}

// Export for use in error handlers
export { anonymizeIP, logSecurityWarning };

export default {
  securityHeaders,
  validateContentType,
  validateRequest,
  validateOrigin,
  anonymizeIP,
  logSecurityWarning,
};
