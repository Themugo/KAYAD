// backend/utils/validationSchemas.js
// ─────────────────────────────────────────────────────────────
// Request and Response Validation Schemas
// Provides comprehensive validation for all API endpoints
// using Joi schema validation
// ─────────────────────────────────────────────────────────────

import Joi from "joi";
import { logError } from "./logger.js";

// =============================
// 📋 COMMON SCHEMAS
// =============================

const commonSchemas = {
  // ID validation
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid ID format",
    }),

  // Email validation
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email address",
    }),

  // Phone validation (Kenya format)
  phone: Joi.string()
    .pattern(/^(?:\+254|0)?[7]\d{8}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid phone number format",
    }),

  // Password validation
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  },

  // Sorting
  sorting: {
    sortBy: Joi.string().valid("createdAt", "price", "mileage", "year").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  },
};

// =============================
// 🔐 AUTH SCHEMAS
// =============================

const authSchemas = {
  // Login request
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),

  // Register request
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name must not exceed 100 characters",
    }),
    phone: commonSchemas.phone,
  }),

  // Refresh token request
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      "string.empty": "Refresh token is required",
    }),
  }),

  // Change password request
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required",
    }),
    newPassword: commonSchemas.password,
  }),

  // Forgot password request
  forgotPassword: Joi.object({
    email: commonSchemas.email,
  }),

  // Reset password request
  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      "string.empty": "Reset token is required",
    }),
    password: commonSchemas.password,
  }),
};

// =============================
// 🚗 CAR SCHEMAS
// =============================

const carSchemas = {
  // Create car request
  create: Joi.object({
    title: Joi.string().min(5).max(200).required().messages({
      "string.min": "Title must be at least 5 characters",
      "string.max": "Title must not exceed 200 characters",
    }),
    description: Joi.string().min(50).max(5000).required().messages({
      "string.min": "Description must be at least 50 characters",
      "string.max": "Description must not exceed 5000 characters",
    }),
    price: Joi.number().positive().required().messages({
      "number.positive": "Price must be positive",
    }),
    mileage: Joi.number().min(0).required().messages({
      "number.min": "Mileage cannot be negative",
    }),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).required().messages({
      "number.min": "Year must be 1990 or later",
      "number.max": "Year cannot be in the future",
    }),
    make: Joi.string().required().messages({
      "string.empty": "Make is required",
    }),
    model: Joi.string().required().messages({
      "string.empty": "Model is required",
    }),
    transmission: Joi.string().valid("automatic", "manual").required(),
    fuelType: Joi.string().required(),
    bodyType: Joi.string().required(),
    color: Joi.string().required(),
    location: Joi.string().required(),
    images: Joi.array()
      .items(Joi.string().uri())
      .min(1)
      .max(20)
      .required()
      .messages({
        "array.min": "At least one image is required",
        "array.max": "Maximum 20 images allowed",
      }),
    features: Joi.array().items(Joi.string()).max(50).messages({
      "array.max": "Maximum 50 features allowed",
    }),
  }),

  // Update car request
  update: Joi.object({
    title: Joi.string().min(5).max(200),
    description: Joi.string().min(50).max(5000),
    price: Joi.number().positive(),
    mileage: Joi.number().min(0),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1),
    make: Joi.string(),
    model: Joi.string(),
    transmission: Joi.string().valid("automatic", "manual"),
    fuelType: Joi.string(),
    bodyType: Joi.string(),
    color: Joi.string(),
    location: Joi.string(),
    images: Joi.array().items(Joi.string().uri()).min(1).max(20),
    features: Joi.array().items(Joi.string()).max(50),
    status: Joi.string().valid("active", "sold", "pending", "inactive"),
  }),

  // Car listing filters
  listFilters: Joi.object({
    status: Joi.string().valid("active", "sold", "pending", "inactive"),
    minPrice: Joi.number().positive(),
    maxPrice: Joi.number().positive(),
    make: Joi.string(),
    model: Joi.string(),
    year: Joi.number().integer(),
    location: Joi.string(),
    ...commonSchemas.pagination,
    ...commonSchemas.sorting,
  }),

  // Car search
  search: Joi.object({
    query: Joi.string().min(2).max(100).required().messages({
      "string.min": "Search query must be at least 2 characters",
      "string.max": "Search query must not exceed 100 characters",
    }),
    ...commonSchemas.pagination,
  }),
};

// =============================
// 🎪 AUCTION SCHEMAS
// =============================

const auctionSchemas = {
  // Create auction request
  create: Joi.object({
    carId: commonSchemas.id,
    startTime: Joi.date().iso().min("now").required().messages({
      "date.min": "Start time must be in the future",
    }),
    endTime: Joi.date()
      .iso()
      .greater(Joi.ref("startTime"))
      .required()
      .messages({
        "date.greater": "End time must be after start time",
      }),
    startingPrice: Joi.number().positive().required().messages({
      "number.positive": "Starting price must be positive",
    }),
  }),

  // Auction listing filters
  listFilters: Joi.object({
    status: Joi.string().valid("upcoming", "active", "ended", "cancelled"),
    ...commonSchemas.pagination,
  }),
};

// =============================
// 💰 BID SCHEMAS
// =============================

const bidSchemas = {
  // Place bid request
  place: Joi.object({
    amount: Joi.number().positive().required().messages({
      "number.positive": "Bid amount must be positive",
    }),
  }),

  // Bid listing filters
  listFilters: Joi.object({
    ...commonSchemas.pagination,
  }),
};

// =============================
// 👤 USER SCHEMAS
// =============================

const userSchemas = {
  // Update profile request
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100),
    phone: commonSchemas.phone,
    location: Joi.string(),
    profilePicture: Joi.string().uri(),
  }),

  // User filters
  listFilters: Joi.object({
    role: Joi.string().valid("user", "seller", "admin", " inspector"),
    emailVerified: Joi.boolean(),
    ...commonSchemas.pagination,
    ...commonSchemas.sorting,
  }),
};

// =============================
// 📊 ANALYTICS SCHEMAS
// =============================

const analyticsSchemas = {
  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref("startDate")),
  }),

  // Market stats filters
  marketStatsFilters: Joi.object({
    make: Joi.string(),
    location: Joi.string(),
    ...analyticsSchemas.dateRange,
  }),
};

// =============================
// 🔧 VALIDATION MIDDLEWARE
// =============================

/**
 * Validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      logError("Validation error", new Error("Validation failed"), { errors });

      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Query validation middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      logError("Query validation error", new Error("Query validation failed"), { errors });

      return res.status(400).json({
        error: "Query validation failed",
        code: "QUERY_VALIDATION_ERROR",
        details: errors,
      });
    }

    // Replace request query with validated and sanitized data
    req.query = value;
    next();
  };
};

/**
 * Params validation middleware
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      logError("Params validation error", new Error("Params validation failed"), { errors });

      return res.status(400).json({
        error: "Params validation failed",
        code: "PARAMS_VALIDATION_ERROR",
        details: errors,
      });
    }

    // Replace request params with validated and sanitized data
    req.params = value;
    next();
  };
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  commonSchemas,
  authSchemas,
  carSchemas,
  auctionSchemas,
  bidSchemas,
  userSchemas,
  analyticsSchemas,
  validate,
  validateQuery,
  validateParams,
};
