// middleware/asyncHandler.js
import crypto from "crypto";

const asyncHandler = (fn, label = "ASYNC_HANDLER") => {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (err) {
      req.requestId = req.requestId || crypto.randomUUID() || Date.now().toString(36);

      // STAGE 2 API CONTRACT CONVERGENCE FIX: this middleware (and errorHandler.js
      // right after it) only ever read err.statusCode. But the dominant convention
      // across the service layer — auctionSettlement.service.js, auctionRegistration
      // .service.js, auctionSetup.service.js, ecpService.js, and others (~76 call
      // sites vs. 18 using .statusCode) — is `Object.assign(new Error(msg), { status })`.
      // That meant a real, intentional 409/403 thrown by those services was silently
      // overwritten to 500 right here, before errorHandler ever saw the real code —
      // e.g. POST /api/auctions/:id/outcome/default's "payment already received"
      // conflict arrived at the client as a 500 instead of the intended 409.
      // Falling back to err.status (only when err.statusCode isn't already set)
      // converges to the convention the majority of the codebase already uses,
      // rather than rewriting every one of those throw sites.
      if (!err.statusCode) err.statusCode = err.status || 500;

      next(err);
    }
  };
};

export default asyncHandler;
