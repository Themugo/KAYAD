// middleware/asyncHandler.js

const asyncHandler = (fn, label = "ASYNC_HANDLER") => {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (err) {
      // 🔥 Enhanced logging (VERY useful in production)
      console.error(`❌ ${label}:`, {
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.id || "guest",
      });

      // 🧠 Attach fallback status if missing
      if (!err.statusCode) {
        err.statusCode = 500;
      }

      next(err);
    }
  };
};

export default asyncHandler;