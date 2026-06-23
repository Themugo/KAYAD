// API Deprecation Middleware
// Adds deprecation headers and warnings for deprecated endpoints

const deprecationMiddleware = (options = {}) => {
  const {
    deprecated = false,
    sunsetDate = null,
    migrationGuide = null,
    newEndpoint = null,
  } = options;

  return (req, res, next) => {
    if (!deprecated) {
      return next();
    }

    // Add deprecation headers
    res.setHeader('X-API-Deprecated', 'true');

    if (sunsetDate) {
      res.setHeader('X-API-Sunset-Date', sunsetDate);
    }

    if (newEndpoint) {
      res.setHeader('X-API-Replacement', newEndpoint);
    }

    // Add warning header (RFC 7234)
    const warning = deprecated ? '299 - "This API endpoint is deprecated"' : '';
    if (warning) {
      res.setHeader('Warning', warning);
    }

    // Log deprecation access
    console.warn('Deprecated endpoint accessed:', {
      path: req.path,
      method: req.method,
      sunsetDate,
      newEndpoint,
    });

    next();
  };
};

// Deprecation policy constants
export const DEPRECATION_POLICY = {
  NOTICE_PERIOD: 6, // months
  SUNSET_PERIOD: 12, // months
  WARNING_INTERVALS: [6, 3, 1], // months before sunset
};

export default deprecationMiddleware;
