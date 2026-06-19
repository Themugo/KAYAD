// backend/utils/queryHelper.js
// ─────────────────────────────────────────────────────────────
// Reusable query building utilities to reduce code duplication
// ─────────────────────────────────────────────────────────────

/**
 * Build pagination options from query parameters
 * @param {Object} query - Express request query object
 * @param {Object} options - Configuration options
 * @returns {Object} Pagination options
 */
export const buildPagination = (query, options = {}) => {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    defaultPage = 1,
  } = options;

  const page = Math.max(parseInt(query.page) || defaultPage, 1);
  const limit = Math.min(
    parseInt(query.limit) || defaultLimit,
    maxLimit
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build sort options from query parameters
 * @param {Object} query - Express request query object
 * @param {Object} defaultSort - Default sort options
 * @returns {Object} Sort options
 */
export const buildSort = (query, defaultSort = { createdAt: -1 }) => {
  if (!query.sort) return defaultSort;

  const sortField = query.sort;
  const sortOrder = query.order === 'asc' ? 1 : -1;

  return { [sortField]: sortOrder };
};

/**
 * Build filter options from query parameters
 * @param {Object} query - Express request query object
 * @param {Object} allowedFields - Map of query param to mongoose field
 * @returns {Object} Filter options
 */
export const buildFilter = (query, allowedFields = {}) => {
  const filter = {};

  for (const [param, field] of Object.entries(allowedFields)) {
    if (query[param]) {
      filter[field] = query[param];
    }
  }

  // Handle search parameter
  if (query.search && allowedFields.search) {
    const searchFields = Array.isArray(allowedFields.search) 
      ? allowedFields.search 
      : [allowedFields.search];
    
    filter.$or = searchFields.map(field => ({
      [field]: { $regex: query.search, $options: 'i' }
    }));
  }

  return filter;
};

/**
 * Build projection options (select specific fields)
 * @param {Object} query - Express request query object
 * @param {Array} defaultFields - Default fields to include
 * @returns {Object} Projection options
 */
export const buildProjection = (query, defaultFields = []) => {
  if (!query.fields) return {};

  const fields = query.fields.split(',');
  const projection = {};

  for (const field of fields) {
    projection[field] = 1;
  }

  return projection;
};

/**
 * Execute paginated query with common options
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Object} Query result with pagination metadata
 */
export const executePaginatedQuery = async (Model, filter = {}, options = {}) => {
  const {
    query = {},
    sort = { createdAt: -1 },
    projection = {},
    populate = [],
  } = options;

  const { page, limit, skip } = buildPagination(query);

  const [data, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .select(projection)
      .skip(skip)
      .limit(limit)
      .populate(populate)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Build text search filter for MongoDB
 * @param {string} searchTerm - Search term
 * @param {Array} fields - Fields to search in
 * @returns {Object} MongoDB filter
 */
export const buildTextSearch = (searchTerm, fields) => {
  if (!searchTerm) return {};

  const regex = new RegExp(searchTerm, 'i');
  const orConditions = fields.map(field => ({ [field]: regex }));

  return { $or: orConditions };
};

/**
 * Build date range filter
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @param {string} field - Date field name
 * @returns {Object} MongoDB filter
 */
export const buildDateRange = (startDate, endDate, field = 'createdAt') => {
  const filter = {};

  if (startDate) {
    filter[field] = { ...filter[field], $gte: new Date(startDate) };
  }

  if (endDate) {
    filter[field] = { ...filter[field], $lte: new Date(endDate) };
  }

  return filter;
};

/**
 * Build price range filter
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @param {string} field - Price field name
 * @returns {Object} MongoDB filter
 */
export const buildPriceRange = (minPrice, maxPrice, field = 'price') => {
  const filter = {};

  if (minPrice) {
    filter[field] = { ...filter[field], $gte: Number(minPrice) };
  }

  if (maxPrice) {
    filter[field] = { ...filter[field], $lte: Number(maxPrice) };
  }

  return filter;
};
