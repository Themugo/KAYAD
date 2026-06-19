import { AppError } from "../utils/AppError.ts";

export const csrfProtection = (req, res, next) => {
  const sensitiveMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!sensitiveMethods.includes(req.method)) return next();

  const hasAuthHeader = !!req.headers.authorization;
  const hasCsrfHeader = req.headers["x-requested-by"] === "kayad-app";
  const hasXsrfHeader = req.headers["x-xsrf-token"];

  if (hasAuthHeader) return next();

  if (hasCsrfHeader || hasXsrfHeader) return next();

  return next(AppError.forbidden("CSRF validation failed"));
};
