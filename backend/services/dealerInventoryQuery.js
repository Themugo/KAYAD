/**
 * Dealer inventory page loader.
 *
 * Root cause of the slow/timed-out inventory screen: the controller used `Car.find(filter)` with no limit, pulled EVERY
 * listing the dealer owns (all columns, including the JSONB image arrays and descriptions) into memory, then sliced one
 * page and counted statuses in JavaScript. Cost therefore grew with the dealer's total inventory on every page view
 * and every filter change, regardless of the 20-row page being asked for.
 *
 * Now: the database applies skip/limit to the page, and the stats come from cheap per-status COUNT queries run in
 * parallel. The response shape and the stats semantics (counts follow the active status filter) are unchanged.
 */
export const INVENTORY_STAT_STATUSES = ['published', 'draft', 'pending', 'reserved', 'sold', 'archived'];

export function parseInventoryPaging(query = {}) {
  const pageNum = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { pageNum, limitNum };
}

export async function loadInventoryPage(CarModel, { dealerId, status, page, limit }) {
  const base = { dealer: dealerId, deletedAt: { $exists: false } }; // soft-deleted listings are not inventory
  const filter = status ? { ...base, status } : base;
  const wanted = INVENTORY_STAT_STATUSES.filter((s) => !status || status === s);
  const [items, total, ...counts] = await Promise.all([
    CarModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    CarModel.countDocuments(filter),
    ...wanted.map((s) => CarModel.countDocuments({ ...base, status: s })),
  ]);
  const stats = { total, published: 0, draft: 0, pending: 0, reserved: 0, sold: 0, archived: 0 };
  wanted.forEach((s, i) => { stats[s] = counts[i]; });
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, stats };
}
