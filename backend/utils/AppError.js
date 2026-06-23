export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Bad request", details = null) {
    return new AppError(msg, 400, details);
  }

  static unauthorized(msg = "Unauthorized", details = null) {
    return new AppError(msg, 401, details);
  }

  static forbidden(msg = "Forbidden", details = null) {
    return new AppError(msg, 403, details);
  }

  static notFound(msg = "Resource not found", details = null) {
    return new AppError(msg, 404, details);
  }

  static conflict(msg = "Conflict", details = null) {
    return new AppError(msg, 409, details);
  }

  static tooMany(msg = "Too many requests", details = null) {
    return new AppError(msg, 429, details);
  }

  static internal(msg = "Internal server error", details = null) {
    return new AppError(msg, 500, details);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV !== "production" && { stack: this.stack }),
    };
  }
}
