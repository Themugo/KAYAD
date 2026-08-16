// backend/middleware/timeout.js
// ─────────────────────────────────────────────────────────────
// Operation-specific request timeout middleware
// ─────────────────────────────────────────────────────────────

// Fixed (Phase 14, performance/observability hardening): this
// middleware called req.setTimeout(ms)/res.setTimeout(ms) but never
// attached a 'timeout' event listener to actually act on it. In
// Node's http module, .setTimeout(ms) alone only configures the
// socket to EMIT a 'timeout' event after that many idle milliseconds
// - it does not abort the request, destroy the connection, or send
// any response by itself. With no listener doing something about that
// event, the timeout fires into a void: the connection stays open
// indefinitely, and a client waiting on a genuinely hung underlying
// operation (a database query that never resolves, an external API
// call that never returns) gets no response, no error, nothing -
// forever. This was confirmed directly, not theorized: Phase 13 of
// this hardening series built a real, live test server and observed
// exactly this symptom on GET /health (a route already using this
// exact middleware) - the request was accepted but never answered,
// reproducing a mystery this program first noted, unexplained, in its
// very first phase.
//
// Fixed by adding a real 'timeout' listener that sends a proper 503
// response (if headers haven't already been sent) and destroys the
// socket - the behavior this middleware's own name and intent already
// promised, now actually implemented. res.headersSent is checked
// first since the timeout can legitimately race with a slow-but-
// eventually-successful response that started sending just before the
// deadline.

const attachTimeoutHandler = (req, res, timeoutMs) => {
  const onTimeout = () => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: "Request timed out. Please try again.",
      });
    }
    req.destroy();
  };
  req.setTimeout(timeoutMs, onTimeout);
  res.setTimeout(timeoutMs, onTimeout);
};

export const createTimeoutMiddleware = (timeoutMs) => {
  return (req, res, next) => {
    attachTimeoutHandler(req, res, timeoutMs);
    next();
  };
};

// Pre-configured timeout middleware for different operation types
export const fastTimeout = createTimeoutMiddleware(5_000); // 5 seconds for simple queries
export const mediumTimeout = createTimeoutMiddleware(10_000); // 10 seconds for standard operations
export const slowTimeout = createTimeoutMiddleware(30_000); // 30 seconds for complex operations
export const externalTimeout = createTimeoutMiddleware(15_000); // 15 seconds for external API calls
export const uploadTimeout = createTimeoutMiddleware(120_000); // 2 minutes for file uploads
