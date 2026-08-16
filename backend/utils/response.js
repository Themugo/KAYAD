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
// ✅ CREATED (201) RESPONSE
// =============================
// Added while activating backend/inspection/ (the dormant inspection
// marketplace system) - its controller (providerController.js) calls
// response.created(...) 6 times but this file never exported it,
// which - combined with a separate import-name mismatch in the same
// system's routes file - is very likely the actual reason this
// substantial, otherwise well-built system was never mounted. Mirrors
// success() exactly, at the correct 201 status for a resource-creation
// response rather than reusing success()'s 200 and losing that
// distinction.
export const created = (res, data = null, message = "Created", meta = {}) => {
  return res.status(201).json({
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
export const unauthorized = (res, message = "Unauthorized") => {
  return res.status(401).json({
    success: false,
    message,
  });
};
