import { getSupabase } from "../utils/supabase.js";
import { mapKeyOut, mapRowIn, SEARCHABLE_FIELDS, FIELD_ALIASES, camelToSnake, normalizeSelect } from "../utils/fieldMap.js";

const TABLE_MAP = {
  User: "users", Car: "cars", Auction: "auctions", Bid: "bids",
  Escrow: "escrows", Payment: "payments", Chat: "chats", Message: "messages",
  Notification: "notifications", Favorite: "favorites", Review: "reviews",
  Dealer: "dealers", DealerHealthScore: "dealer_health_scores",
  DealerTeam: "dealer_teams", DealerTrustScore: "dealer_trust_scores",
  DealerVerification: "dealer_verifications",
  AuditLog: "audit_logs", SecurityLog: "security_logs",
  RefreshToken: "refresh_tokens", Dispute: "disputes", Evidence: "evidence",
  Lead: "leads", LeadActivity: "lead_activities",
  SupportTicket: "support_tickets", FeatureFlag: "feature_flags",
  PlatformConfig: "platform_config", Announcement: "announcements",
  SavedSearch: "saved_searches", Report: "reports",
  Transaction: "transactions", Subscription: "subscriptions",
  MarketData: "market_data", MarketPricing: "market_pricing",
  BrandDepreciation: "brand_depreciation", MileageImpact: "mileage_impact",
  VehicleValuation: "vehicle_valuations",
  VehicleMarketAnalytics: "vehicle_market_analytics",
  SearchAnalytics: "search_analytics", ListingQuality: "listing_quality",
  MarketplaceHealth: "marketplace_health", FraudDetection: "fraud_detection",
  ConversionFunnel: "conversion_funnels", Organization: "organizations",
  Department: "departments", Branch: "branches", Team: "teams",
  Role: "roles", LedgerAccount: "ledger_accounts",
  LedgerEntry: "ledger_entries",
  ReconciliationRecord: "reconciliation_records",
  ReconciliationReport: "reconciliation_reports",
  EscrowAnomaly: "escrow_anomalies", EscrowRiskScore: "escrow_risk_scores",
  EscrowAudit: "escrow_audits", EscrowVault: "escrow_vaults",
  AuctionIntegrityFlag: "auction_integrity_flags",
  AuctionRiskProfile: "auction_risk_profiles",
  MpesaTransaction: "mpesa_transactions", SmsBidder: "sms_bidders",
  Contact: "contacts", ContactShield: "contact_shields",
  NotificationAudit: "notification_audits",
  NtsaVerificationRequest: "ntsa_verification_requests",
  InspectionOrder: "inspection_orders",
  InspectorApplication: "inspector_applications",
  ErrorBudget: "error_budgets", IdempotencyKey: "idempotency_keys",
  IdempotencyAuditLog: "idempotency_audit_logs",
  JobFailure: "job_failures", Ad: "ads", AdminAlert: "admin_alerts",
  Event: "events", DuplicateVehicleLog: "duplicate_vehicle_logs",
  Referral: "referrals", Feedback: "feedback",
  DemandSignals: "demand_signals", GlobalSettings: "global_settings",
  Ticket: "support_tickets",
};

// ────────────────────────────────────────────────────────────────
// FIELD-NAME TRANSLATION LAYER
//
// The application code (controllers, models) was originally written
// against MongoDB/Mongoose and still uses that field-naming
// convention (camelCase, and several fields that were simply
// *renamed* along the way — e.g. `brand` vs the real `make` column).
// The actual database is now Postgres/Supabase with snake_case
// columns. Previously NOTHING translated between the two, so any
// filter, sort, or write using a field name that wasn't already
// identical in both places (the common case for anything not a
// single lowercase word) silently failed or errored. This layer
// fixes that centrally, for every model, instead of touching every
// controller.
//
// Two things happen:
//  1. Generic camelCase -> snake_case conversion for anything not
//     explicitly mapped (handles createdAt/created_at,
//     isVerified/is_verified, bodyType/body_type, etc "for free").
//  2. An explicit per-table alias table for real renames that a
//     case-transform can't fix (brand -> make, fuel -> fuel_type,
//     dealer -> dealer_id, etc).
// ────────────────────────────────────────────────────────────────

// field name -> table it relates to, for populate(). Defaults to
// "users" for anything not listed (the overwhelming majority of
// populated fields across this app are person/actor references).
const RELATION_TABLE = {
  car: "cars", vehicle: "cars", carId: "cars", relatedCar: "cars",
  originalCar: "cars", matchedCars: "cars",
  auction: "auctions", relatedAuctions: "auctions",
  escrow: "escrows", relatedEscrow: "escrows", relatedEscrows: "escrows",
  relatedPayment: "payments",
};

async function runPopulates(table, rowsOrRow, populates, sb) {
  if (!populates || populates.length === 0 || !rowsOrRow) return rowsOrRow;
  const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
  if (rows.length === 0) return rowsOrRow;

  for (const { field, select } of populates) {
    const fkColumn = FIELD_ALIASES[table]?.[field]
      || (field.toLowerCase().endsWith("id") ? camelToSnake(field) : `${camelToSnake(field)}_id`);
    const targetTable = RELATION_TABLE[field] || "users";

    const idSet = new Set();
    for (const row of rows) {
      const val = row?.[fkColumn] ?? row?.[field];
      if (Array.isArray(val)) val.forEach((v) => v && idSet.add(v));
      else if (val) idSet.add(val);
    }
    if (idSet.size === 0) continue;

    const columns = select ? select.split(/\s+/).filter((c) => !c.startsWith("-")).join(",") || "*" : "*";
    try {
      const client = sb();
      const { data, error } = await client.from(targetTable).select(columns).in("id", [...idSet]);
      if (error || !data) continue;
      const byId = new Map(data.map((d) => [d.id, mapRowIn(targetTable, d)]));
      for (const row of rows) {
        const val = row?.[fkColumn] ?? row?.[field];
        if (Array.isArray(val)) {
          row[field] = val.map((v) => byId.get(v)).filter(Boolean);
        } else if (val) {
          row[field] = byId.get(val) || row[field];
        }
      }
    } catch { /* population is best-effort; leave the raw FK value in place */ }
  }
  return rowsOrRow;
}

function wrapDoc(doc, tableName, sb) {
  if (!doc) return null;
  mapRowIn(tableName, doc);
  return Object.defineProperties(doc, {
    _id: { get() { return this.id; }, set(v) { this.id = v; }, enumerable: true, configurable: true },
    save: {
      value: async function () {
        const client = sb();
        const payload = {};
        for (const [k, v] of Object.entries(this)) {
          if (["save", "toObject", "_id"].includes(k)) continue;
          payload[mapKeyOut(tableName, k)] = v;
        }
        const { data, error } = await client.from(tableName).update(payload).eq("id", this.id).select().single();
        if (error) throw error;
        if (data) Object.assign(this, mapRowIn(tableName, data));
        return this;
      },
      writable: true, configurable: true,
    },
    toObject: {
      value: function () { return { ...this }; },
      writable: true, configurable: true,
    },
  });
}

function createQuery(tableName) {
  const sb = () => getSupabase();
  return {
    _select: "*",
    _lean: false,
    _filters: {},
    _sort: null,
    _limit: null,
    _skip: null,
    _findById: null,
    _populates: [],
    _executor: null,

    select(fields) {
      this._select = normalizeSelect(tableName, fields);
      return this;
    },

    lean() {
      this._lean = true;
      return this;
    },

    sort(spec) {
      this._sort = spec;
      return this;
    },

    limit(n) {
      this._limit = n;
      return this;
    },

    skip(n) {
      this._skip = n;
      return this;
    },

    where(filters) {
      this._filters = { ...this._filters, ...filters };
      return this;
    },

    distinct(field) {
      return this._executor().then(rows => [...new Set(rows.map(r => r[field]).filter(Boolean))]);
    },

    populate(field, select) {
      if (field) this._populates.push({ field, select });
      return this;
    },

    then(resolve, reject) {
      return this._executor().then(resolve, reject);
    },

    catch(reject) {
      return this._executor().then(undefined, reject);
    },

    finally(handler) {
      return this._executor().finally(handler);
    },

    session(_session) {
      return this;
    },
  };
}

export function createModel(name) {
  const table = TABLE_MAP[name] || name.toLowerCase();
  const sb = () => getSupabase();

  function buildWhere(supabaseQuery, filters) {
    let q = supabaseQuery;
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null) continue;

      if (k === "$text") {
        const term = v?.$search;
        const fields = SEARCHABLE_FIELDS[table];
        if (term && fields?.length) {
          const orExpr = fields.map((f) => `${f}.ilike.*${term.replace(/[,%]/g, "")}*`).join(",");
          q = q.or(orExpr);
        }
        continue;
      }

      if (k === "$or") {
        const orExpr = v.map((cond) =>
          Object.entries(cond).map(([fk, fv]) => {
            const col = mapKeyOut(table, fk);
            if (fv && typeof fv === "object" && fv.$regex) {
              const term = (fv.$regex.source || fv.$regex).toString().replace(/[,%^$]/g, "");
              return `${col}.ilike.*${term}*`;
            }
            return `${col}.eq.${fv}`;
          }).join(",")
        ).join(",");
        q = q.or(orExpr);
        continue;
      }

      if (k === "$and") {
        for (const cond of v) {
          for (const [fk, fv] of Object.entries(cond)) q = q.eq(mapKeyOut(table, fk), fv);
        }
        continue;
      }

      if (k.startsWith("$")) continue;

      const col = mapKeyOut(table, k);

      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        if (v.$gte !== undefined) q = q.gte(col, v.$gte);
        if (v.$lte !== undefined) q = q.lte(col, v.$lte);
        if (v.$gt !== undefined) q = q.gt(col, v.$gt);
        if (v.$lt !== undefined) q = q.lt(col, v.$lt);
        if (v.$ne !== undefined) q = q.neq(col, v.$ne);
        if (v.$in !== undefined) q = q.in(col, v.$in);
        if (v.$nin !== undefined) q = q.not(col, "in", `(${v.$nin.join(",")})`);
        if (v.$regex !== undefined) {
          const term = (v.$regex.source || v.$regex).toString().replace(/[\^$]/g, "");
          q = q.ilike(col, `%${term}%`);
        }
      } else {
        q = q.eq(col, v);
      }
    }
    return q;
  }

  const model = {
    table,

    find(filters = {}) {
      const sel = typeof filters === "object" && !Array.isArray(filters) ? { ...filters } : {};
      const q = createQuery(table);
      q._filters = sel;
      q._executor = async () => {
        const client = sb();
        let query = client.from(table).select(q._select);
        query = buildWhere(query, q._filters);
        if (q._sort) {
          for (const [k, dir] of Object.entries(q._sort)) {
            query = query.order(mapKeyOut(table, k), { ascending: dir === 1 });
          }
        }
        if (q._limit) query = query.limit(q._limit);
        if (q._skip) query = query.range(q._skip, q._skip + (q._limit || 1000) - 1);
        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []).map((d) => q._lean ? mapRowIn(table, d) : wrapDoc(d, table, sb));
        await runPopulates(table, rows, q._populates, sb);
        return rows;
      };
      return q;
    },

    findById(id) {
      const q = createQuery(table);
      q._findById = id;
      q._executor = async () => {
        if (!q._findById) return null;
        const client = sb();
        const { data, error } = await client.from(table).select(q._select).eq("id", q._findById).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const row = q._lean ? mapRowIn(table, data) : wrapDoc(data, table, sb);
        await runPopulates(table, row, q._populates, sb);
        return row;
      };
      return q;
    },

    findOne(filters = {}) {
      const q = createQuery(table);
      q._filters = { ...filters };
      q._executor = async () => {
        const client = sb();
        let query = client.from(table).select(q._select).limit(1);
        query = buildWhere(query, q._filters);
        const { data, error } = await query;
        if (error) throw error;
        const doc = data?.[0] || null;
        if (!doc) return null;
        const row = q._lean ? mapRowIn(table, doc) : wrapDoc(doc, table, sb);
        await runPopulates(table, row, q._populates, sb);
        return row;
      };
      return q;
    },

    async create(data) {
      const client = sb();
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [mapKeyOut(table, k), v]));
      const { data: created, error } = await client.from(table).insert(payload).select().single();
      if (error) throw error;
      return wrapDoc(created, table, sb);
    },

    async findByIdAndUpdate(id, update, options = {}) {
      if (!id) return null;
      const client = sb();
      let updateData = {};
      if (update.$set) updateData = { ...updateData, ...update.$set };
      if (update.$inc) {
        const current = await model.findById(id);
        if (current) {
          for (const [k, v] of Object.entries(update.$inc)) {
            updateData[k] = (current[k] || 0) + v;
          }
        }
      }
      if (update.$push) {
        const current = await model.findById(id);
        if (current) {
          for (const [k, v] of Object.entries(update.$push)) {
            updateData[k] = [...(current[k] || []), v];
          }
        }
      }
      if (update.$pull) {
        const current = await model.findById(id);
        if (current) {
          for (const [k, v] of Object.entries(update.$pull)) {
            updateData[k] = (current[k] || []).filter((item) => String(item) !== String(v));
          }
        }
      }
      for (const [k, v] of Object.entries(update)) {
        if (!k.startsWith("$")) updateData[k] = v;
      }
      if (Object.keys(updateData).length === 0) return await model.findById(id);
      const payload = Object.fromEntries(Object.entries(updateData).map(([k, v]) => [mapKeyOut(table, k), v]));
      const q = client.from(table).update(payload).eq("id", id);
      if (options.new !== false) q.select();
      const { data, error } = await q;
      if (error) throw error;
      const row = options.new !== false ? (Array.isArray(data) ? data?.[0] : data) : null;
      return row ? wrapDoc(row, table, sb) : null;
    },

    async findOneAndUpdate(filter, update, options = {}) {
      const existing = await model.findOne(filter);
      if (!existing) {
        if (options.upsert) return model.create({ ...filter, ...update.$set, ...update });
        return null;
      }
      return model.findByIdAndUpdate(existing.id, update, options);
    },

    async findByIdAndDelete(id) {
      if (!id) return null;
      const doc = await model.findById(id);
      if (!doc) return null;
      const client = sb();
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) throw error;
      return doc;
    },

    async findOneAndDelete(filter) {
      const doc = await model.findOne(filter);
      if (!doc) return null;
      return model.findByIdAndDelete(doc.id);
    },

    async deleteMany(filters = {}) {
      const client = sb();
      let q = client.from(table).delete();
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined) continue;
        const col = mapKeyOut(table, k);
        if (typeof v === "object" && v.$in) q = q.in(col, v.$in);
        else q = q.eq(col, v);
      }
      const { error, count } = await q;
      if (error) throw error;
      return { deletedCount: count || 0 };
    },

    async updateMany(filters = {}, update) {
      const docs = await model.find(filters);
      if (docs.length === 0) return { modifiedCount: 0 };
      const ids = docs.map((d) => d.id);
      const client = sb();
      let updateData = {};
      if (update.$set) updateData = { ...update.$set };
      if (update.$inc) {
        for (const doc of docs) {
          for (const [k, v] of Object.entries(update.$inc)) {
            updateData[k] = (doc[k] || 0) + v;
          }
        }
      }
      const payload = Object.fromEntries(Object.entries(updateData).map(([k, v]) => [mapKeyOut(table, k), v]));
      const { error } = await client.from(table).update(payload).in("id", ids);
      if (error) throw error;
      return { modifiedCount: ids.length };
    },

    async countDocuments(filters = {}) {
      const client = sb();
      let q = client.from(table).select("*", { count: "exact", head: true });
      q = buildWhere(q, filters);
      const { count: c, error } = await q;
      if (error) throw error;
      return c || 0;
    },

    async insertMany(docs) {
      const client = sb();
      const payload = docs.map((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [mapKeyOut(table, k), v])));
      const { data, error } = await client.from(table).insert(payload).select();
      if (error) throw error;
      return (data || []).map((d) => mapRowIn(table, d));
    },

    async distinct(field, filters = {}) {
      const docs = await model.find(filters);
      return [...new Set(docs.map((d) => d[field]).filter(Boolean))];
    },

    async aggregate(pipeline) {
      const docs = await model.find({});
      let result = docs;
      for (const stage of pipeline) {
        if (stage.$match) {
          result = result.filter((d) => {
            for (const [k, v] of Object.entries(stage.$match)) {
              if (typeof v === "object" && v.$gte && d[k] < v.$gte) return false;
              if (typeof v === "object" && v.$lte && d[k] > v.$lte) return false;
              if (typeof v === "object" && v.$ne && d[k] === v.$ne) return false;
              if (typeof v === "object" && v.$in && !v.$in.includes(d[k])) return false;
              if (d[k] !== v) return false;
            }
            return true;
          });
        } else if (stage.$group) {
          const grouped = {};
          for (const d of result) {
            const groupField = typeof stage.$group._id === "string" ? stage.$group._id.replace("$", "") : null;
            const key = groupField ? d[groupField] : null;
            // Accumulator fields (count, sum, avg, etc.) are populated
            // entirely by the loop below, driven by whatever the
            // caller's $group actually asked for — no implicit
            // "count" is auto-added here. It used to unconditionally
            // increment a hardcoded `count` field AND let the $sum:1
            // logic below increment the same field again, silently
            // doubling every grouped count across every admin
            // analytics endpoint that uses the standard
            // `{ count: { $sum: 1 } }` pattern (fraud stats, dispute
            // stats, audit logs, and more).
            if (!grouped[key]) grouped[key] = { _id: key };
            for (const [k, v] of Object.entries(stage.$group)) {
              if (k === "_id") continue;
              if (v.$sum === 1) grouped[key][k] = (grouped[key][k] || 0) + 1;
              else if (v.$sum) grouped[key][k] = (grouped[key][k] || 0) + (d[v.$sum.replace("$", "")] || 0);
              else if (v.$avg) {
                if (!grouped[key]._avgCount) grouped[key]._avgCount = 0;
                if (!grouped[key]._avgSum) grouped[key]._avgSum = 0;
                grouped[key]._avgCount++;
                grouped[key]._avgSum += d[v.$avg.replace("$", "")] || 0;
                grouped[key][k] = grouped[key]._avgSum / grouped[key]._avgCount;
              }
            }
          }
          result = Object.values(grouped);
        } else if (stage.$sort) {
          const [key, dir] = Object.entries(stage.$sort)[0];
          result.sort((a, b) => (dir === -1 ? b[key] - a[key] : a[key] - b[key]));
        } else if (stage.$limit) {
          result = result.slice(0, stage.$limit);
        } else if (stage.$skip) {
          result = result.slice(stage.$skip);
        }
      }
      return result;
    },
  };

  return model;
}
