// utils/pagination.js

// =============================
// 📄 PAGINATION PARSER
// =============================
export const paginate = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 📊 PAGINATION RESPONSE BUILDER
// =============================
export const buildPagination = ({ total, page, limit }) => {
  const pages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};
