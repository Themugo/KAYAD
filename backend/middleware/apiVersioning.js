// backend/middleware/apiVersioning.js
// ─────────────────────────────────────────────────────────────
// API Versioning Middleware
// Implements API versioning with support for multiple versions
// and backward compatibility
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn } from "../utils/logger.js";

// =============================
// ⚙️ VERSION CONFIGURATION
// =============================

const VERSION_CONFIG = {
  // Current API version
  current: "v1",
  
  // Supported versions
  supported: ["v1"],
  
  // Deprecated versions (with deprecation dates)
  deprecated: {},
  
  // Default version if none specified
  default: "v1",
  
  // Version header name
  versionHeader: "API-Version",
  
  // Accept header for version negotiation
  acceptHeader: "Accept",
};

// =============================
// 📋 VERSION VALIDATION
// =============================

/**
 * Validate API version
 */
export const validateVersion = (version) => {
  if (!version) {
    return { valid: true, version: VERSION_CONFIG.default };
  }

  const normalizedVersion = version.startsWith("v") ? version : `v${version}`;

  if (VERSION_CONFIG.supported.includes(normalizedVersion)) {
    return { valid: true, version: normalizedVersion };
  }

  if (VERSION_CONFIG.deprecated[normalizedVersion]) {
    return { 
      valid: true, 
      version: normalizedVersion, 
      deprecated: true,
      deprecationDate: VERSION_CONFIG.deprecated[normalizedVersion]
    };
  }

  return { valid: false, version: null };
};

// =============================
// 🔧 VERSION MIDDLEWARE
// =============================

/**
 * API versioning middleware
 * Extracts and validates API version from request
 */
export const apiVersioning = (req, res, next) => {
  // Try to get version from header
  let version = req.headers[VERSION_CONFIG.versionHeader.toLowerCase()];
  
  // Try to get version from Accept header
  if (!version) {
    const acceptHeader = req.headers[VERSION_CONFIG.acceptHeader];
    if (acceptHeader) {
      const match = acceptHeader.match(/application\/vnd\.kayad\.v(\d+)\+json/);
      if (match) {
        version = `v${match[1]}`;
      }
    }
  }
  
  // Try to get version from URL path
  if (!version && req.path) {
    const match = req.path.match(/\/api\/v(\d+)\//);
    if (match) {
      version = `v${match[1]}`;
    }
  }

  const validation = validateVersion(version);

  if (!validation.valid) {
    return res.status(400).json({
      error: "Unsupported API version",
      code: "UNSUPPORTED_VERSION",
      details: {
        requested: version,
        supported: VERSION_CONFIG.supported,
        default: VERSION_CONFIG.default,
      },
    });
  }

  // Set version on request
  req.apiVersion = validation.version;
  
  // Add deprecation warning if applicable
  if (validation.deprecated) {
    res.setHeader("X-API-Deprecated", "true");
    res.setHeader("X-API-Deprecation-Date", validation.deprecationDate);
    res.setHeader(
      "Warning",
      `299 - "Deprecated API version ${validation.version}. Please migrate to ${VERSION_CONFIG.current}"`
    );
    
    logWarn("Deprecated API version accessed", {
      version: validation.version,
      deprecationDate: validation.deprecationDate,
      path: req.path,
    });
  }

  // Add API version header to response
  res.setHeader("X-API-Version", validation.version);

  next();
};

// =============================
// 🔄 VERSION ROUTER
// =============================

/**
 * Create versioned route handler
 */
export const createVersionedHandler = (handlers) => {
  return (req, res, next) => {
    const version = req.apiVersion || VERSION_CONFIG.default;
    const handler = handlers[version] || handlers[VERSION_CONFIG.default];
    
    if (handler) {
      return handler(req, res, next);
    }
    
    return res.status(501).json({
      error: "Endpoint not implemented for this API version",
      code: "NOT_IMPLEMENTED",
      details: {
        version,
        availableVersions: Object.keys(handlers),
      },
    });
  };
};

// =============================
// 📊 VERSION METRICS
// =============================

const versionMetrics = {
  requests: {},
  deprecatedRequests: {},
};

/**
 * Track version usage
 */
export const trackVersionUsage = (version, deprecated = false) => {
  if (!versionMetrics.requests[version]) {
    versionMetrics.requests[version] = 0;
  }
  versionMetrics.requests[version]++;
  
  if (deprecated) {
    if (!versionMetrics.deprecatedRequests[version]) {
      versionMetrics.deprecatedRequests[version] = 0;
    }
    versionMetrics.deprecatedRequests[version]++;
  }
};

/**
 * Get version metrics
 */
export const getVersionMetrics = () => {
  return {
    ...versionMetrics,
    current: VERSION_CONFIG.current,
    supported: VERSION_CONFIG.supported,
    deprecated: VERSION_CONFIG.deprecated,
  };
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  VERSION_CONFIG,
  validateVersion,
  apiVersioning,
  createVersionedHandler,
  trackVersionUsage,
  getVersionMetrics,
};
