import { getSupabase } from "../utils/supabase.js";

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

function wrapDoc(doc, tableName, sb) {
  if (!doc) return null;
  return Object.defineProperties(doc, {
    _id: { get() { return this.id; }, set(v) { this.id = v; }, enumerable: true, configurable: true },
    save: {
      value: async function () {
        const client = sb();
        const { data, error } = await client.from(tableName).update(Object.fromEntries(
          Object.entries(this).filter(([k]) => !["save","toObject","_id"].includes(k))
        )).eq("id", this.id).select().single();
        if (error) throw error;
        if (data) Object.assign(this, data);
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
    _executor: null,

    select(fields) {
      this._select = fields;
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

    populate() {
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
      if (k === "$or") {
        const orParts = v.map((cond) =>
          Object.entries(cond).map(([fk, fv]) => `${fk}.eq.${fv}`).join(",")
        ).join(",");
        q = q.or(orParts);
      } else if (k === "$and") {
        for (const cond of v) {
          for (const [fk, fv] of Object.entries(cond)) q = q.eq(fk, fv);
        }
      } else if (k.startsWith("$")) continue;
      else if (typeof v === "object" && v !== null) {
        if (v.$gte) q = q.gte(k, v.$gte);
        if (v.$lte) q = q.lte(k, v.$lte);
        if (v.$gt) q = q.gt(k, v.$gt);
        if (v.$lt) q = q.lt(k, v.$lt);
        if (v.$ne) q = q.neq(k, v.$ne);
        if (v.$in) q = q.in(k, v.$in);
        if (v.$nin) q = q.not.in(k, v.$nin);
        if (v.$regex) q = q.ilike(k, `%${v.$regex.source || v.$regex}%`);
      } else {
        q = q.eq(k, v);
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
            query = query.order(k, { ascending: dir === 1 });
          }
        }
        if (q._limit) query = query.limit(q._limit);
        if (q._skip) query = query.range(q._skip, q._skip + (q._limit || 1000) - 1);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((d) => q._lean ? d : wrapDoc(d, table, sb));
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
        return data ? (q._lean ? data : wrapDoc(data, table, sb)) : null;
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
        return doc ? (q._lean ? doc : wrapDoc(doc, table, sb)) : null;
      };
      return q;
    },

    async create(data) {
      const client = sb();
      const { data: created, error } = await client.from(table).insert(data).select().single();
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
      const q = client.from(table).update(updateData).eq("id", id);
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
        if (typeof v === "object" && v.$in) q = q.in(k, v.$in);
        else q = q.eq(k, v);
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
      const { error } = await client.from(table).update(updateData).in("id", ids);
      if (error) throw error;
      return { modifiedCount: ids.length };
    },

    async countDocuments(filters = {}) {
      const client = sb();
      let q = client.from(table).select("*", { count: "exact", head: true });
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null) q = q.eq(k, v);
      }
      const { count: c, error } = await q;
      if (error) throw error;
      return c || 0;
    },

    async insertMany(docs) {
      const client = sb();
      const { data, error } = await client.from(table).insert(docs).select();
      if (error) throw error;
      return data || [];
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
            const key = stage.$group._id ? d[stage.$group._id] : null;
            if (!grouped[key]) grouped[key] = { _id: key, count: 0 };
            grouped[key].count++;
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
