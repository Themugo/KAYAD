// backend/utils/controllerHelper.js
// ─────────────────────────────────────────────────────────────
// Reusable controller helper functions to reduce code duplication
// ─────────────────────────────────────────────────────────────

import { logError } from "./logger.js";
import { AppError } from "./AppError.js";

/**
 * Standard success response format
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
export const successResponse = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 */
export const errorResponse = (res, message = "Error", statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
  });
};

/**
 * Async handler wrapper to catch errors in controllers
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle resource not found
 * @param {string} resourceName - Name of the resource
 * @returns {Function} Express middleware function
 */
export const notFoundHandler = (resourceName = "Resource") => {
  return (req, res, next) => {
    return errorResponse(res, `${resourceName} not found`, 404);
  };
};

/**
 * Validate required fields in request body
 * @param {Array} fields - Array of required field names
 * @returns {Function} Express middleware function
 */
export const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return errorResponse(
        res,
        `Missing required fields: ${missing.join(", ")}`,
        400
      );
    }
    
    next();
  };
};

/**
 * Get resource by ID with error handling
 * @param {Model} Model - Mongoose model
 * @param {string} id - Resource ID
 * @param {string} resourceName - Name of the resource for error messages
 * @returns {Promise<Object>} Found resource
 */
export const getResourceById = async (Model, id, resourceName = "Resource") => {
  const resource = await Model.findById(id);
  
  if (!resource) {
    throw new AppError(`${resourceName} not found`, 404);
  }
  
  return resource;
};

/**
 * Update resource with partial data
 * @param {Object} resource - Mongoose document
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Updated resource
 */
export const updateResource = async (resource, updates) => {
  Object.assign(resource, updates);
  return await resource.save();
};

/**
 * Delete resource with error handling
 * @param {Model} Model - Mongoose model
 * @param {string} id - Resource ID
 * @param {string} resourceName - Name of the resource for error messages
 * @returns {Promise<Object>} Deleted resource
 */
export const deleteResource = async (Model, id, resourceName = "Resource") => {
  const resource = await getResourceById(Model, id, resourceName);
  await resource.deleteOne();
  return resource;
};

/**
 * Check if user owns the resource
 * @param {Object} resource - Resource with userId field
 * @param {string} userId - User ID to check
 * @param {string} userRole - User role (admin can bypass)
 * @returns {boolean} True if user owns resource or is admin
 */
export const checkOwnership = (resource, userId, userRole) => {
  const isAdmin = ["admin", "superadmin"].includes(userRole);
  const isOwner = resource.userId?.toString() === userId || 
                  resource.createdBy?.toString() === userId ||
                  resource.user?.toString() === userId;
  
  return isAdmin || isOwner;
};

/**
 * Filter sensitive fields from user object
 * @param {Object} user - User object
 * @returns {Object} Filtered user object
 */
export const sanitizeUser = (user) => {
  const sanitized = user.toObject ? user.toObject() : { ...user };
  
  const sensitiveFields = [
    "password",
    "resetToken",
    "resetTokenExpire",
    "emailVerifyToken",
    "emailVerifyExpire",
    "tokenVersion",
  ];
  
  for (const field of sensitiveFields) {
    delete sanitized[field];
  }
  
  return sanitized;
};

/**
 * Build filter for user's own resources (or all if admin)
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {string} userField - Field name for user reference in resource
 * @returns {Object} MongoDB filter
 */
export const buildUserFilter = (userId, userRole, userField = "userId") => {
  const isAdmin = ["admin", "superadmin"].includes(userRole);
  
  if (isAdmin) {
    return {};
  }
  
  return { [userField]: userId };
};

/**
 * Handle file upload errors
 * @param {Error} error - Upload error
 * @param {Object} res - Express response object
 */
export const handleUploadError = (error, res) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return errorResponse(res, "File size exceeds limit", 400);
  }
  
  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return errorResponse(res, "Unexpected file field", 400);
  }
  
  logError("File upload error", error);
  return errorResponse(res, "File upload failed", 500);
};

/**
 * Paginate array data (for non-database pagination)
 * @param {Array} data - Array to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated data
 */
export const paginateArray = (data, page = 1, limit = 20) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: data.length,
      pages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: page > 1,
    },
  };
};

/**
 * Parse and validate MongoDB ObjectId
 * @param {string} id - ID string to validate
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
export const getClientIp = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
         "unknown";
};
