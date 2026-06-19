// backend/middleware/timeout.js
// ─────────────────────────────────────────────────────────────
// Operation-specific request timeout middleware
// ─────────────────────────────────────────────────────────────

export const createTimeoutMiddleware = (timeoutMs) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs);
    next();
  };
};

// Pre-configured timeout middleware for different operation types
export const fastTimeout = createTimeoutMiddleware(5_000); // 5 seconds for simple queries
export const mediumTimeout = createTimeoutMiddleware(10_000); // 10 seconds for standard operations
export const slowTimeout = createTimeoutMiddleware(30_000); // 30 seconds for complex operations
export const externalTimeout = createTimeoutMiddleware(15_000); // 15 seconds for external API calls
export const uploadTimeout = createTimeoutMiddleware(120_000); // 2 minutes for file uploads
