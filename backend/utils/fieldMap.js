// backend/utils/fieldMap.js
//
// Shared camelCase <-> snake_case field-name translation for the
// Postgres/Supabase data layer. The app was originally written
// against MongoDB/Mongoose (camelCase field names); the real
// database uses Postgres snake_case columns, and in a handful of
// cases the column was given a genuinely different name, not just a
// different case (e.g. `brand` in the app vs `make` in the schema).
//
// Both data-access layers (models/_base.js, used by controllers via
// `Car.find()` etc., and db/index.js, used directly by ~60 service
// files) previously had their own separate, incomplete, and
// independently-buggy copies of this translation. Centralizing it
// here means a fix (or a newly-discovered rename) only needs to
// happen in one place.

export const camelToSnake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
export const snakeToCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

// Explicit per-table overrides for genuine renames a case-transform
// can't fix. Add to this as more mismatches are found in other
// tables — do not duplicate this map elsewhere.
export const FIELD_ALIASES = {
  cars: {
    brand: "make",
    fuel: "fuel_type",
    drivetrain: "drive_type",
    engine: "engine_capacity",
    isAuction: "has_auction",
    dealer: "dealer_id",
    city: "location",
    highestBidder: "highest_bidder_id",
  },
  users: {
    logo: "avatar",
    averageRating: "rating",
    completedChecks: "inspections_completed",
  },
  inspector_applications: {
    user: "user_id",
  },
  inspection_orders: {
    buyer: "requested_by",
    car: "car_id",
    inspector: "inspector_id",
    payment: "payment_id",
  },
  payments: {
    user: "user_id",
    car: "car_id",
  },
  escrows: {
    payment: "payment_id",
    buyer: "buyer_id",
    seller: "seller_id",
    car: "car_id",
  },
};

export const REVERSE_FIELD_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([table, map]) => [
    table,
    Object.fromEntries(Object.entries(map).map(([js, sql]) => [sql, js])),
  ])
);

// Which columns a Mongo-style `$text` search should run across, per
// table. Tables not listed here don't support `$text` — we skip the
// filter rather than guess at column names that may not exist.
export const SEARCHABLE_FIELDS = {
  cars: ["title", "make", "model", "description"],
};

export function mapKeyOut(table, key) {
  if (key === "_id") return "id";
  const alias = FIELD_ALIASES[table]?.[key];
  if (alias) return alias;
  return camelToSnake(key);
}

export function mapRowIn(table, row) {
  if (!row || typeof row !== "object") return row;
  const reverse = REVERSE_FIELD_ALIASES[table] || {};
  for (const key of Object.keys(row)) {
    if (key === "id") continue;
    const camelKey = reverse[key] || snakeToCamel(key);
    if (camelKey !== key && !(camelKey in row)) {
      row[camelKey] = row[key];
    }
  }
  return row;
}

// Mongoose-style projections come as either a space-separated string
// ("title price images") or an object ({ title: 1, price: 1 }).
// Postgrest's .select() requires a comma-separated column list — a
// space-separated string is read as one (nonexistent) column name,
// and an object is nonsense to it. Normalize both into what Postgrest
// actually expects, translating each field name through the same
// table-aware alias map used everywhere else.
export function normalizeSelect(table, fields) {
  if (!fields || fields === "*") return "*";
  let names;
  if (typeof fields === "string") {
    names = fields.trim().includes(",")
      ? fields.split(",").map((s) => s.trim())
      : fields.trim().split(/\s+/);
  } else if (typeof fields === "object") {
    names = Object.entries(fields).filter(([, v]) => v).map(([k]) => k);
  } else {
    return "*";
  }
  names = names.filter(Boolean).filter((n) => n !== "score"); // "score" is a $text virtual, not a real column
  if (names.length === 0) return "*";
  return names.map((n) => mapKeyOut(table, n)).join(",");
}
