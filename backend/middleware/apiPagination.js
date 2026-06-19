// backend/middleware/apiPagination.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// API pagination middleware
// Provides standardized pagination for list endpoints
// ─────────────────────────────────────────────────────────────

// =============================
// 📊 PAGINATION CONSTANTS
// =============================

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
};

// =============================
// 📊 SAFE PAGINATION HELPER
// =============================

export const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || PAGINATION.DEFAULT_PAGE, 1);
  const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 📊 PAGINATION METADATA GENERATOR
// =============================

export const getPaginationMetadata = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
};

// =============================
// 📊 PAGINATION MIDDLEWARE
// =============================

export const paginate = (req, res, next) => {
  const pagination = getPagination(req);
  req.pagination = pagination;
  next();
};

// =============================
// 📊 PAGINATION RESPONSE WRAPPER
// =============================

export const withPagination = (data, total, page, limit) => {
  return {
    success: true,
    data,
    pagination: getPaginationMetadata(total, page, limit),
  };
};

// =============================
// 📊 CURSOR-BASED PAGINATION (for large datasets)
// =============================

export const getCursorPagination = (req) => {
  const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const cursor = req.query.cursor || null;
  const direction = req.query.direction === "prev" ? "prev" : "next";

  return { limit, cursor, direction };
};

export const withCursorPagination = (data, nextCursor, prevCursor, hasMore) => {
  return {
    success: true,
    data,
    pagination: {
      nextCursor,
      prevCursor,
      hasMore,
      limit: data.length,
    },
  };
};

export default {
  PAGINATION,
  getPagination,
  getPaginationMetadata,
  paginate,
  withPagination,
  getCursorPagination,
  withCursorPagination,
};
