// backend/inspection/services/dbAdapter.js
//
// Found while activating backend/inspection/ (the dormant inspection
// marketplace system, per docs/PRE_PURCHASE_INSPECTION_FORENSIC_AUDIT.md):
// every one of its 4 service files does `import db from '../../db/index.js'`
// (a default import) and calls db.find/db.findById/db.findOne/db.create/
// db.update/db.count/db.updateMany/db.aggregate/db.findWithPagination -
// but the real db/index.js has no default export at all, only named
// exports, and two of those names don't match (`find` -> the real name
// is `findAll`; `findWithPagination` doesn't exist at all - the closest
// real equivalent, `paginate`, has a different parameter shape and
// return value). This import/name mismatch would have crashed at
// runtime on the first database call - very likely a real, direct
// contributor to why this substantial, otherwise well-built system was
// never mounted.
//
// This adapter is the fix: a single, local object exposing exactly the
// method names this system's own service files already call, built
// from the real db/index.js functions - no calls sites in the ~2,700
// lines of service code needed to change, and no behavior of the real
// db layer is altered. findWithPagination specifically is a genuine
// bridge (not a rename) between this system's old skip/limit/sort/
// projection call shape and the real paginate()'s page/limit/filters/
// orderBy shape - documented inline below.

import {
  findAll,
  findById,
  findOne,
  create,
  update,
  updateMany,
  count,
  aggregate,
  paginate,
} from '../../db/index.js';

/**
 * Bridges this system's `db.findWithPagination(table, query, { sort,
 * skip, limit, projection })` calls to the real `paginate(table, {
 * page, limit, filters, orderBy, ascending, select })`. Converts
 * skip -> page (paginate is page-based, not skip-based), extracts a
 * single sort field/direction from the old `sort` object shape, and
 * returns a plain array (matching what every real call site in this
 * system expects back) rather than paginate's own richer
 * `{data, pagination}` shape - the pagination metadata itself is
 * reconstructed separately where a call site actually needs it.
 */
async function findWithPagination(table, filters = {}, options = {}) {
  const limit = options.limit || 20;
  const skip = options.skip || 0;
  const page = Math.floor(skip / limit) + 1;

  let orderBy;
  let ascending = true;
  if (options.sort && typeof options.sort === 'object') {
    const [field, direction] = Object.entries(options.sort)[0] || [];
    if (field) {
      orderBy = field;
      ascending = direction !== -1 && direction !== 'desc';
    }
  }

  const result = await paginate(table, { page, limit, filters, orderBy, ascending });
  return result.data;
}

const db = {
  find: findAll,
  findById,
  findOne,
  create,
  update,
  updateMany,
  count,
  aggregate,
  findWithPagination,
};

export default db;
