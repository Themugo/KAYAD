// middleware/asyncHandler.js
import crypto from "crypto";

const asyncHandler = (fn, label = "ASYNC_HANDLER") => {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (err) {
      req.requestId = req.requestId || crypto.randomUUID() || Date.now().toString(36);

      if (!err.statusCode) err.statusCode = 500;

      next(err);
    }
  };
};

export default asyncHandler;
