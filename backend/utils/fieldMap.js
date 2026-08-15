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
  // bids and favorites had no entry here at all, meaning Bid.create({ user })
  // and Favorite.create({ user, car }) were writing literal columns
  // "user"/"car" (camelToSnake of a single word is a no-op) - but the real
  // columns are user_id/car_id. Every bid placement and every favorite
  // would have failed with an unknown-column error. Found by auditing
  // every write call across the backend against the real schema - see
  // the migration this was added alongside for the full trail.
  bids: {
    user: "user_id",
    carId: "car_id",
    checkoutRequestID: "checkout_request_id",
  },
  favorites: {
    user: "user_id",
    car: "car_id",
    carSnapshot: "car_snapshot",
  },
  notifications: {
    user: "user_id",
  },
  audit_logs: {
    actor: "actor_id",
    target: "entity_id",
    targetModel: "entity_type",
  },
  // reviews had no entry here at all - Review.create({ user, dealer, car })
  // wrote those 3 keys literally, but the real columns are reviewer_id/
  // dealer_id/car_id (not a plain camelToSnake conversion for user/dealer,
  // since neither word naturally becomes its *_id-suffixed real name).
  // Every review submission (controllers/reviewController.js, the only
  // real write path) would have failed with an unknown-column error.
  reviews: {
    user: "reviewer_id",
    dealer: "dealer_id",
    car: "car_id",
  },
  cars: {
    // brand, fuel, engine need no translation - confirmed via
    // seed_demo_vehicles.sql.sql and update_car_bid_stats.sql.sql that
    // these ARE the real column names (previously mapped to make/
    // fuel_type/engine_capacity, which don't exist in the real schema -
    // see the schema-repair migrations for the full evidence trail).
    drivetrain: "drive_type",
    isAuction: "has_auction",
    dealer: "dealer_id",
    city: "location_city",
    // Added (Fusion Phase 6): carController.js's getCars/createCar/
    // updateCar all reference a plain "location" field directly
    // (select("...location...") in getCars; body.location in create/
    // update) - confirmed no alias existed for it, meaning every one
    // of those calls was translating "location" via generic
    // camelToSnake("location") = "location" (a no-op, since it's a
    // single lowercase word) rather than to the real column. The real
    // column, per supabase/migrations/..._foundational_tables.sql.sql
    // (the authoritative source established in Phase 5's schema
    // correction, cross-referenced against 3 independent sources), is
    // location_city - there is no column literally named "location" on
    // the real cars table. A comment inside carController.js itself
    // claims "location is a flat TEXT column", but no migration
    // (including every one after foundational_tables) ever defines or
    // renames a column to that name - that comment was almost
    // certainly written against the same stale backend/db/
    // schema_clean.sql source Phase 5 already found and corrected.
    // Fixed as a single alias entry (not by rewriting every call site
    // individually) since mapKeyOut is the shared translation function
    // used by both the read path (select/where/sort) and the write
    // path (create/update) - one change corrects both.
    location: "location_city",
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
  user_auth: {
    user: "user_id",
  },
  user_preferences: {
    user: "user_id",
  },
  bidder_deposits: {
    user: "user_id",
    auction: "auction_id",
  },
  bid_logs: {
    bid: "bid_id",
    user: "user_id",
    auction: "auction_id",
    car: "car_id",
  },
  transaction_ledger: {
    fromUser: "from_user",
    toUser: "to_user",
    car: "car_id",
    escrow: "escrow_id",
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
  cars: ["title", "brand", "model", "description"],
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
  names = names.map((n) => n.replace(/^\+/, "")).filter(Boolean).filter((n) => n !== "score"); // strip Mongoose +prefix; "score" is a $text virtual
  if (names.length === 0) return "*";
  return names.map((n) => mapKeyOut(table, n)).join(",");
}
