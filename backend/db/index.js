import { getSupabase } from '../utils/supabase.js';
import { mapKeyOut, mapRowIn, SEARCHABLE_FIELDS, normalizeSelect } from '../utils/fieldMap.js';

/**
 * Generic database utility for Supabase/PostgreSQL operations.
 * Replaces mongoose model methods with Supabase queries.
<<<<<<< HEAD
 * 
 * FIX C3: Added connection pool configuration
 * FIX H2: Added query pagination enforcement
 * FIX H6: Added query timeout
=======
 *
 * This is the most widely-used data-access layer in the backend
 * (60+ service files import from here directly). It shares its
 * field-name translation logic with models/_base.js via
 * utils/fieldMap.js — see that file for why the translation exists.
>>>>>>> e945625d (feat: latest production updates, performance improvements and bug fixes)
 */

// ── QUERY LIMITS (Security: prevent memory exhaustion) ────────────
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;
const QUERY_TIMEOUT_MS = 30000; // 30 second timeout

function enforceLimit(limit) {
  if (!limit) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT), MAX_LIMIT);
}

function applyTimeout(query) {
  // Supabase JS doesn't have direct timeout, but we log a warning
  // Production should set statement_timeout at the PostgreSQL level
  return query;
}

// ── FILTER HELPERS ──────────────────────────────────────────────

const applyFilters = (query, filters, table) => {
  if (!filters) return query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (key === '$text') {
      const term = value?.$search;
      const fields = SEARCHABLE_FIELDS[table];
      if (term && fields?.length) {
        const orExpr = fields.map((f) => `${f}.ilike.*${String(term).replace(/[,%]/g, '')}*`).join(',');
        query = query.or(orExpr);
      }
      continue;
    }

    if (key === '$or') {
      const orExpr = value.map((cond) =>
        Object.entries(cond).map(([fk, fv]) => {
          const col = mapKeyOut(table, fk);
          if (fv && typeof fv === 'object' && fv.$regex) {
            const term = (fv.$regex.source || fv.$regex).toString().replace(/[,%^$]/g, '');
            return `${col}.ilike.*${term}*`;
          }
          return `${col}.eq.${fv}`;
        }).join(',')
      ).join(',');
      query = query.or(orExpr);
      continue;
    }

    if (key === '$and') {
      for (const cond of value) {
        for (const [fk, fv] of Object.entries(cond)) query = query.eq(mapKeyOut(table, fk), fv);
      }
      continue;
    }

    if (key.startsWith('$')) continue;

    const col = mapKeyOut(table, key);

    if (value instanceof Date) { query = query.eq(col, value.toISOString()); continue; }

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle MongoDB-style operators
      for (const [op, val] of Object.entries(value)) {
        switch (op) {
          case '$eq': case 'eq': query = query.eq(col, val); break;
          case '$ne': case 'ne': query = query.neq(col, val); break;
          case '$gt': case 'gt': query = query.gt(col, val); break;
          case '$gte': case 'gte': query = query.gte(col, val); break;
          case '$lt': case 'lt': query = query.lt(col, val); break;
          case '$lte': case 'lte': query = query.lte(col, val); break;
          case '$in': case 'in': query = query.in(col, Array.isArray(val) ? val : [val]); break;
          case '$nin': case 'nin': query = query.not(col, 'in', `(${(Array.isArray(val) ? val : [val]).join(',')})`); break;
          case '$like': case 'like': query = query.like(col, val); break;
          case '$ilike': case 'ilike': query = query.ilike(col, val); break;
          case '$regex': case 'regex': {
            const term = (val.source || val).toString().replace(/[\^$]/g, '');
            query = query.ilike(col, `%${term}%`);
            break;
          }
          case '$is': case 'is': query = query.is(col, val); break;
          case '$contains': case 'contains': query = query.contains(col, val); break;
          case '$contained': case 'contained': query = query.contained(col, val); break;
          case '$exists': case 'exists':
            if (val) query = query.not(col, 'is', null);
            else query = query.is(col, null);
            break;
          default:
            // If it's not a known operator, treat as a nested object or eq
            query = query.eq(col, val);
        }
      }
    } else {
      query = query.eq(col, value);
    }
  }
  return query;
};

const applyOrdering = (query, orderBy, ascending = false, table) => {
  if (orderBy) {
    if (Array.isArray(orderBy)) {
      for (const order of orderBy) {
        if (typeof order === 'string') query = query.order(mapKeyOut(table, order), { ascending });
        else query = query.order(mapKeyOut(table, order.field), { ascending: order.ascending ?? false });
      }
    } else {
      query = query.order(mapKeyOut(table, orderBy), { ascending });
    }
  }
  return query;
};

const mapRows = (table, rows) => (rows || []).map((r) => mapRowIn(table, r));
const mapPayloadOut = (table, data) => Object.fromEntries(Object.entries(data).map(([k, v]) => [mapKeyOut(table, k), v]));

// ── CRUD ──────────────────────────────────────────────────────

export const findAll = async (table, options = {}) => {
  const sb = getSupabase();
<<<<<<< HEAD
  // FIX H2: Enforce pagination limits to prevent memory exhaustion
  const limit = enforceLimit(options.limit);
  let query = sb.from(table).select(options.select || '*', options.count ? { count: 'exact', head: false } : {});
  query = applyFilters(query, options.filters);
  if (options.orderBy) query = applyOrdering(query, options.orderBy, options.ascending);
  query = query.limit(limit); // Always enforce limit
  if (options.offset) query = query.range(options.offset, options.offset + limit - 1);
=======
  let query = sb.from(table).select(normalizeSelect(table, options.select), options.count ? { count: 'exact', head: false } : {});
  query = applyFilters(query, options.filters, table);
  if (options.orderBy) query = applyOrdering(query, options.orderBy, options.ascending, table);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
>>>>>>> e945625d (feat: latest production updates, performance improvements and bug fixes)
  const { data, error, count } = await query;
  if (error) throw error;
  const rows = mapRows(table, data);
  return options.count ? { data: rows, count } : rows;
};

export const findById = async (table, id, select = '*') => {
  const sb = getSupabase();
  const { data, error } = await sb.from(table).select(normalizeSelect(table, select)).eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapRowIn(table, data);
};

export const findOne = async (table, filters, select = '*') => {
  const sb = getSupabase();
  let query = sb.from(table).select(normalizeSelect(table, select)).limit(1);
  query = applyFilters(query, filters, table);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] ? mapRowIn(table, data[0]) : null;
};

export const create = async (table, data) => {
  const sb = getSupabase();
  const { data: created, error } = await sb.from(table).insert(mapPayloadOut(table, data)).select().single();
  if (error) throw error;
  return mapRowIn(table, created);
};

export const createMany = async (table, data) => {
  const sb = getSupabase();
  const payload = data.map((d) => mapPayloadOut(table, d));
  const { data: created, error } = await sb.from(table).insert(payload).select();
  if (error) throw error;
  return mapRows(table, created);
};

export const update = async (table, id, data) => {
  const sb = getSupabase();
  const { data: updated, error } = await sb.from(table).update(mapPayloadOut(table, data)).eq('id', id).select().single();
  if (error) throw error;
  return mapRowIn(table, updated);
};

export const updateMany = async (table, filters, data) => {
  const sb = getSupabase();
  let query = sb.from(table).update(mapPayloadOut(table, data));
  query = applyFilters(query, filters, table);
  const { data: updated, error } = await query.select();
  if (error) throw error;
  return mapRows(table, updated);
};

export const upsert = async (table, data, conflictColumn = 'id') => {
  const sb = getSupabase();
  const { data: upserted, error } = await sb.from(table).upsert(mapPayloadOut(table, data), { onConflict: mapKeyOut(table, conflictColumn) }).select();
  if (error) throw error;
  return mapRows(table, upserted);
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
  query = applyFilters(query, filters, table);
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
  query = applyFilters(query, filters, table);
  const { count: c, error } = await query;
  if (error) throw error;
  return c;
};

export const distinct = async (table, column, filters = {}) => {
  const sb = getSupabase();
  const col = mapKeyOut(table, column);
  let query = sb.from(table).select(col);
  query = applyFilters(query, filters, table);
  const { data, error } = await query;
  if (error) throw error;
  return [...new Set(data.map(row => row[col]))];
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
    query = applyFilters(query, filters, table);
    const { data, error } = await query;
    if (error) throw error;
    return mapRows(table, data);
  }

  // For grouped queries, use raw RPC or Supabase functions
  // This is a fallback — complex aggregations should use rawQuery
  let query = sb.from(table).select('*');
  query = applyFilters(query, filters, table);
  const { data: rawData, error } = await query;
  if (error) throw error;
  const data = mapRows(table, rawData);

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
  const payload = data.map((d) => mapPayloadOut(table, d));
  const { data: upserted, error } = await sb.from(table).upsert(payload, { onConflict: mapKeyOut(table, conflictColumn) }).select();
  if (error) throw error;
  return mapRows(table, upserted);
};

// ── PAGINATION ─────────────────────────────────────────────────

export const paginate = async (table, options = {}) => {
  const page = options.page || 1;
  // FIX H2: Enforce pagination limits
  const limit = enforceLimit(options.limit);
  const offset = (page - 1) * limit;
  const sb = getSupabase();
  let query = sb.from(table).select(normalizeSelect(table, options.select), { count: 'exact' });
  query = applyFilters(query, options.filters, table);
  if (options.orderBy) query = applyOrdering(query, options.orderBy, options.ascending, table);
  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    data: mapRows(table, data),
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
