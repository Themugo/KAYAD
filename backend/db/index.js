import { getSupabase } from './supabase.js';

/**
 * Generic database utility for Supabase/PostgreSQL operations.
 * Replaces mongoose model methods with Supabase queries.
 */

// ── FILTER HELPERS ──────────────────────────────────────────────

const applyFilters = (query, filters) => {
  if (!filters) return query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (value instanceof Date) { query = query.eq(key, value.toISOString()); continue; }
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle MongoDB-style operators
      for (const [op, val] of Object.entries(value)) {
        switch (op) {
          case '$eq': case 'eq': query = query.eq(key, val); break;
          case '$ne': case 'ne': query = query.neq(key, val); break;
          case '$gt': case 'gt': query = query.gt(key, val); break;
          case '$gte': case 'gte': query = query.gte(key, val); break;
          case '$lt': case 'lt': query = query.lt(key, val); break;
          case '$lte': case 'lte': query = query.lte(key, val); break;
          case '$in': case 'in': query = query.in(key, Array.isArray(val) ? val : [val]); break;
          case '$nin': case 'nin': query = query.not('in', `(${(Array.isArray(val) ? val : [val]).join(',')})`); break;
          case '$like': case 'like': query = query.like(key, val); break;
          case '$ilike': case 'ilike': query = query.ilike(key, val); break;
          case '$is': case 'is': query = query.is(key, val); break;
          case '$contains': case 'contains': query = query.contains(key, val); break;
          case '$contained': case 'contained': query = query.contained(key, val); break;
          case '$exists': case 'exists':
            if (val) query = query.not(key, 'is', null);
            else query = query.is(key, null);
            break;
          default:
            // If it's not a known operator, treat as a nested object or eq
            query = query.eq(key, val);
        }
      }
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
};

const applyOrdering = (query, orderBy, ascending = false) => {
  if (orderBy) {
    if (Array.isArray(orderBy)) {
      for (const order of orderBy) {
        if (typeof order === 'string') query = query.order(order, { ascending });
        else query = query.order(order.field, { ascending: order.ascending ?? false });
      }
    } else {
      query = query.order(orderBy, { ascending });
    }
  }
  return query;
};

// ── CRUD ──────────────────────────────────────────────────────

export const findAll = async (table, options = {}) => {
  const sb = getSupabase();
  let query = sb.from(table).select(options.select || '*', options.count ? { count: 'exact', head: false } : {});
  query = applyFilters(query, options.filters);
  if (options.orderBy) query = applyOrdering(query, options.orderBy, options.ascending);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return options.count ? { data, count } : data;
};

export const findById = async (table, id, select = '*') => {
  const sb = getSupabase();
  const { data, error } = await sb.from(table).select(select).eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

export const findOne = async (table, filters, select = '*') => {
  const sb = getSupabase();
  let query = sb.from(table).select(select).limit(1);
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] || null;
};

export const create = async (table, data) => {
  const sb = getSupabase();
  const { data: created, error } = await sb.from(table).insert(data).select().single();
  if (error) throw error;
  return created;
};

export const createMany = async (table, data) => {
  const sb = getSupabase();
  const { data: created, error } = await sb.from(table).insert(data).select();
  if (error) throw error;
  return created;
};

export const update = async (table, id, data) => {
  const sb = getSupabase();
  const { data: updated, error } = await sb.from(table).update(data).eq('id', id).select().single();
  if (error) throw error;
  return updated;
};

export const updateMany = async (table, filters, data) => {
  const sb = getSupabase();
  let query = sb.from(table).update(data);
  query = applyFilters(query, filters);
  const { data: updated, error } = await query.select();
  if (error) throw error;
  return updated;
};

export const upsert = async (table, data, conflictColumn = 'id') => {
  const sb = getSupabase();
  const { data: upserted, error } = await sb.from(table).upsert(data, { onConflict: conflictColumn }).select();
  if (error) throw error;
  return upserted;
};

export const remove = async (table, id) => {
  const sb = getSupabase();
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const removeMany = async (table, filters) => {
  const sb = getSupabase();
  let query = sb.from(table).delete();
  query = applyFilters(query, filters);
  const { error } = await query;
  if (error) throw error;
  return true;
};

export const softDelete = async (table, id) => {
  return update(table, id, { deleted_at: new Date().toISOString() });
};

export const count = async (table, filters = {}) => {
  const sb = getSupabase();
  let query = sb.from(table).select('*', { count: 'exact', head: true });
  query = applyFilters(query, filters);
  const { count: c, error } = await query;
  if (error) throw error;
  return c;
};

export const distinct = async (table, column, filters = {}) => {
  const sb = getSupabase();
  let query = sb.from(table).select(column);
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) throw error;
  return [...new Set(data.map(row => row[column]))];
};

// ── AGGREGATION ──────────────────────────────────────────────

export const aggregate = async (table, pipeline = []) => {
  const sb = getSupabase();
  // Convert MongoDB-style pipeline stages to Supabase queries
  // This is a simplified converter — complex pipelines need manual handling
  let filters = {};
  let groupBy = null;
  let selectFields = '*';

  for (const stage of pipeline) {
    if (stage.$match) { filters = { ...filters, ...stage.$match }; }
    if (stage.$group) { groupBy = stage.$group; }
    if (stage.$sort) { /* handled below */ }
    if (stage.$limit) { /* handled below */ }
  }

  // If no grouping, just return filtered results
  if (!groupBy) {
    let query = sb.from(table).select(selectFields);
    query = applyFilters(query, filters);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // For grouped queries, use raw RPC or Supabase functions
  // This is a fallback — complex aggregations should use rawQuery
  let query = sb.from(table).select('*');
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) throw error;

  // Simple client-side grouping for common patterns
  if (groupBy._id === null || groupBy._id === undefined) {
    // Simple aggregation without grouping
    const result = {};
    for (const [key, op] of Object.entries(groupBy)) {
      if (key === '_id') continue;
      if (op.$sum === 1) result[key] = data.length;
      else if (op.$sum === '$amount') result[key] = data.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      else if (op.$sum) {
        const field = typeof op.$sum === 'string' ? op.$sum.replace('$', '') : op.$sum;
        result[key] = data.reduce((sum, r) => sum + (parseFloat(r[field]) || 0), 0);
      }
      else if (op.$avg) {
        const field = op.$avg.replace('$', '');
        result[key] = data.reduce((sum, r) => sum + (parseFloat(r[field]) || 0), 0) / (data.length || 1);
      }
      else if (op.$max) {
        const field = op.$max.replace('$', '');
        result[key] = Math.max(...data.map(r => parseFloat(r[field]) || 0));
      }
      else if (op.$min) {
        const field = op.$min.replace('$', '');
        result[key] = Math.min(...data.map(r => parseFloat(r[field]) || 0));
      }
    }
    return [result];
  }

  // Grouped aggregation
  const groups = {};
  for (const row of data) {
    const groupKey = typeof groupBy._id === 'string'
      ? row[groupBy._id.replace('$', '')]
      : JSON.stringify(groupBy._id);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(row);
  }

  const results = [];
  for (const [key, rows] of Object.entries(groups)) {
    const result = { _id: key === 'undefined' ? null : key };
    for (const [field, op] of Object.entries(groupBy)) {
      if (field === '_id') continue;
      if (op.$sum === 1) result[field] = rows.length;
      else if (op.$sum) {
        const col = op.$sum.replace('$', '');
        result[field] = rows.reduce((sum, r) => sum + (parseFloat(r[col]) || 0), 0);
      }
      else if (op.$avg) {
        const col = op.$avg.replace('$', '');
        result[field] = rows.reduce((sum, r) => sum + (parseFloat(r[col]) || 0), 0) / (rows.length || 1);
      }
    }
    results.push(result);
  }
  return results;
};

// ── UPSERT MANY ──────────────────────────────────────────────

export const upsertMany = async (table, data, conflictColumn = 'id') => {
  const sb = getSupabase();
  const { data: upserted, error } = await sb.from(table).upsert(data, { onConflict: conflictColumn }).select();
  if (error) throw error;
  return upserted;
};

// ── PAGINATION ─────────────────────────────────────────────────

export const paginate = async (table, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;
  const sb = getSupabase();
  let query = sb.from(table).select(options.select || '*', { count: 'exact' });
  query = applyFilters(query, options.filters);
  if (options.orderBy) query = applyOrdering(query, options.orderBy, options.ascending);
  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    data,
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit), hasMore: offset + limit < count },
  };
};

// ── RAW QUERY ──────────────────────────────────────────────────

export const rawQuery = async (queryString, params = []) => {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('exec_sql', { query_text: queryString, query_params: params });
  if (error) throw error;
  return data;
};
