// utils/response.js

// =============================
// ✅ SUCCESS RESPONSE
// =============================
export const success = (res, data = null, message = "Success", meta = {}) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    ...(Object.keys(meta).length && { meta }),
  });
};

// =============================
// ❌ ERROR RESPONSE
// =============================
export const error = (res, message = "Error", code = 500, details = null) => {
  return res.status(code).json({
    success: false,
    message,
    ...(details && { details }),
  });
};

// =============================
// ⚠️ VALIDATION ERROR
// =============================
export const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

// =============================
// 🚫 NOT FOUND
// =============================
export const notFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
  });
};

// =============================
// 🔐 UNAUTHORIZED
// =============================
export const errorCode = (res, message = "Error", status = 500, code = null, details = null) => {
  return res.status(status).json({ success: false, message, ...(code && { code }), ...(details && { details }) });
};

export const unauthorized = (res, message = "Unauthorized", code = null) => {
  return res.status(401).json({
    success: false,
    message,
    ...(code && { code }),
  });
};

// Compatibility facade for controllers migrated to the canonical response contract.
export const created = (res, data = null, message = "Created", meta = {}) => res.status(201).json({ success: true, message, data, ...(Object.keys(meta).length ? { meta } : {}) });
export const badRequest = (res, message = "Bad request", details = null) => error(res, message, 400, details);
export const response = { success, error, errorCode, validationError, notFound, unauthorized, created, badRequest };
