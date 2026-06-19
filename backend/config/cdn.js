// backend/config/cdn.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// CDN configuration
// Defines cache headers, edge caching rules, and geographic distribution
// ─────────────────────────────────────────────────────────────

// =============================
// 🌐 CDN CONFIGURATION
// =============================

export const CDN_CONFIG = {
  // Cloudinary CDN (built-in)
  provider: "cloudinary",

  // Cache headers
  cacheHeaders: {
    // Images - cache for 1 year
    "image/jpeg": "public, max-age=31536000, immutable",
    "image/png": "public, max-age=31536000, immutable",
    "image/webp": "public, max-age=31536000, immutable",

    // Fallback - cache for 1 day
    default: "public, max-age=86400",
  },

  // Edge caching rules
  edgeCaching: {
    enabled: true,
    ttl: 31536000, // 1 year
    staleWhileRevalidate: 86400, // 1 day
    staleIfError: 86400, // 1 day
  },

  // Geographic distribution
  geographicDistribution: {
    enabled: true,
    regions: ["us-east-1", "eu-west-1", "ap-southeast-1"],
  },

  // Compression
  compression: {
    enabled: true,
    brotli: true,
    gzip: true,
  },

  // HTTPS
  https: {
    enabled: true,
    redirectHttpToHttps: true,
    hsts: true,
  },
};

// =============================
// 📊 CDN METRICS
// =============================

export const CDN_METRICS = {
  hitRate: 0.95, // Target 95% cache hit rate
  latency: 100, // Target <100ms
  bandwidth: 0.7, // Target 30% bandwidth savings
};

export default CDN_CONFIG;
