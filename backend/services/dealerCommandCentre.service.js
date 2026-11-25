// ============================================================
//  Dealer command centre — READ-ONLY aggregation (no writes, no new tables, no change to escrow/ledger/payment/payout logic).
//
//  Every figure is derived from operational records and follows reports/DEALER-FINANCIAL-DEFINITIONS.md. Nothing is inferred
//  from listing prices, enquiries, offers or bids. The dealership id is supplied by the server (authenticated membership);
//  it is never read from the request. Each section is produced only when the caller already holds a permission that unlocks
//  the same data through an existing route (see resolveAccess) — this service must never widen the dealer role matrix.
// ============================================================
import { getSupabase } from "../utils/supabase.js";
import { listingStatusBreakdown, buildTopPerformers, buildRecentActivity } from "./dealerDashboardSummary.js";

const PAGE = 1000;
const MAX_PAGES = 20;
const RELEASED_STATES = ["released", "closed"];
const HELD_STATES = ["funded", "vehicle_confirmed", "delivered"];
const UNANSWERED_AFTER_MS = 24 * 60 * 60 * 1000;
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? 0 : Number(v));
const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);

/** Dealer's net on an escrow: the stored sellerAmount, else amount − commission (identity: amount = sellerAmount + commission). */
export const escrowNet = (e) => (e.sellerAmount !== null && e.sellerAmount !== undefined ? num(e.sellerAmount) : num(e.amount) - num(e.commission));

/**
 * Access flags. Mirrors existing route guards: inventory/auctions = canListCars|canEditCars (/inventory, /auctions);
 * leads/offers = canChatBuyers (/leads); revenue = canViewEarnings (/dashboard); team = canManageTeam (/team);
 * escrow, payouts, refunds, fees, settlements, outcomes = dealership owner only (/api/dealer/* is owner-only).
 */
export function resolveAccess(org) {
  const owner = org?.isOwner === true;
  const has = (k) => owner || org?.permissions?.[k] === true;
  return {
    owner,
    inventory: has("canListCars") || has("canEditCars"),
    leads: has("canChatBuyers"),
    revenue: has("canViewEarnings"),
    team: has("canManageTeam"),
    auctions: has("canListCars") || has("canEditCars"),
    finance: owner,
  };
}

// ---------- pure derivations (unit-tested against fixtures) ----------

export const PERIOD_DAYS = Object.freeze([7, 30, 90]);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Figures for the selected reporting window (last `days` days) and the equal window before it. Sections the caller may not see are omitted.
 * A sale is a released escrow (same definition as the financial summary); a payout counts when it was paid in the window.
 */
export function summarisePeriod({ cars = [], leads = [], escrows = [], payouts = [], access = {}, now = new Date(), days = 30 }) {
  const d = PERIOD_DAYS.includes(days) ? days : 30;
  const toMs = now.getTime(); const fromMs = toMs - d * DAY_MS; const prevFromMs = fromMs - d * DAY_MS;
  const inWin = (iso, a, b) => { const t = iso ? new Date(iso).getTime() : NaN; return Number.isFinite(t) && t > a && t <= b; };
  const out = { days: d, from: new Date(fromMs).toISOString(), to: now.toISOString() };
  if (access.inventory) {
    out.inventory = { added: cars.filter((c) => inWin(c.created_at, fromMs, toMs)).length, addedPrevious: cars.filter((c) => inWin(c.created_at, prevFromMs, fromMs)).length };
  }
  if (access.leads) {
    out.leads = { received: leads.filter((l) => inWin(l.created_at, fromMs, toMs)).length, previousReceived: leads.filter((l) => inWin(l.created_at, prevFromMs, fromMs)).length };
  }
  if (access.revenue) {
    const sold = escrows.filter((e) => RELEASED_STATES.includes(e.status));
    const cur = sold.filter((e) => inWin(e.releasedAt, fromMs, toMs)); const prev = sold.filter((e) => inWin(e.releasedAt, prevFromMs, fromMs));
    const buckets = d === 7 ? 7 : 6; const size = (d * DAY_MS) / buckets;
    const trend = Array.from({ length: buckets }, (_, i) => {
      const a = fromMs + i * size; const b = i === buckets - 1 ? toMs : a + size;
      const rows = sold.filter((e) => inWin(e.releasedAt, a, b));
      return { start: new Date(a).toISOString(), end: new Date(b).toISOString(), sold: rows.length, revenue: sum(rows, escrowNet) };
    });
    const title = new Map(cars.map((c) => [String(c.id), c.title]));
    out.sales = {
      count: cur.length, revenue: sum(cur, escrowNet), previousCount: prev.length, previousRevenue: sum(prev, escrowNet), trend,
      recent: [...cur].sort((x, y) => new Date(y.releasedAt) - new Date(x.releasedAt)).slice(0, 5).map((e) => ({ id: e.id, car: e.car, title: title.get(String(e.car)) || null, amount: escrowNet(e), releasedAt: e.releasedAt })),
    };
  }
  if (access.finance) {
    const paid = payouts.filter((p) => p.status === "paid");
    const cur = paid.filter((p) => inWin(p.completed_at, fromMs, toMs)); const prev = paid.filter((p) => inWin(p.completed_at, prevFromMs, fromMs));
    out.payouts = { amount: sum(cur, (p) => num(p.net_amount)), previousAmount: sum(prev, (p) => num(p.net_amount)), count: cur.length };
  }
  return out;
}

/** Quality indicators computed from real listing fields only. Lead response needs a recorded response time, which the product does not write yet. */
export function summariseHealth({ cars = [] }) {
  const published = (cars || []).filter((c) => !c.deleted_at && c.status === "available" && c.sold !== true);
  const pct = (n) => (published.length ? Math.round((n / published.length) * 100) : null);
  const complete = published.filter((c) => num(c.price) > 0 && Array.isArray(c.images) && c.images.length > 0).length;
  const viewed = published.filter((c) => num(c.views) > 0).length;
  return {
    published: published.length,
    inventoryQuality: { percent: pct(complete), of: published.length },
    listingPerformance: { percent: pct(viewed), of: published.length },
    leadResponse: { percent: null, unavailableReason: "Lead response times are not recorded yet." },
  };
}

export function summariseListings(cars) {
  const live = (cars || []).filter((c) => !c.deleted_at);
  const b = listingStatusBreakdown(live.map((c) => ({ status: c.status })));
  const sold = live.filter((c) => c.sold === true || c.status === "sold").length;
  return { total: live.length, active: b.available, pendingApproval: b.pending, draft: b.draft, hidden: b.hidden, reserved: b.reserved, sold };
}

export function summariseFinancials({ escrows = [], payouts = [], refunds = [], settlements = [], outcomes = [], now = new Date() }) {
  const released = escrows.filter((e) => RELEASED_STATES.includes(e.status));
  const held = escrows.filter((e) => HELD_STATES.includes(e.status));
  const disputed = escrows.filter((e) => e.status === "disputed");
  const refundedEscrows = escrows.filter((e) => e.status === "refunded");
  const funded = escrows.filter((e) => e.fundedAt);

  const payoutByEscrow = new Map(payouts.map((p) => [String(p.escrow), p]));
  const paid = payouts.filter((p) => p.status === "paid");
  const paidEscrowIds = new Set(paid.map((p) => String(p.escrow)));

  // Pending payout: status exactly `released` (the only state the payout function accepts) with no paid payout.
  const releasedOpen = escrows.filter((e) => e.status === "released" && !paidEscrowIds.has(String(e.id)));
  const pendingParts = { notRequested: { count: 0, amount: 0 }, inProgress: { count: 0, amount: 0 }, failed: { count: 0, amount: 0 } };
  for (const e of releasedOpen) {
    const p = payoutByEscrow.get(String(e.id));
    const amount = p ? num(p.net_amount) : escrowNet(e);
    const bucket = !p ? "notRequested" : p.status === "pending" || p.status === "processing" ? "inProgress" : "failed";
    pendingParts[bucket].count += 1;
    pendingParts[bucket].amount += amount;
  }
  const pendingPayoutAmount = sum(Object.values(pendingParts), (x) => x.amount);
  const closedWithoutPayout = escrows.filter((e) => e.status === "closed" && !paidEscrowIds.has(String(e.id)));

  const heldNet = sum(held, escrowNet);
  const ownEscrowIds = new Set(escrows.map((e) => String(e.id)));
  const ownRefunds = refunds.filter((r) => ownEscrowIds.has(String(r.escrow_id)));
  const completedRefunds = ownRefunds.filter((r) => r.status === "completed");
  const openRefunds = ownRefunds.filter((r) => r.status === "pending" || r.status === "processing");

  const nowMs = now.getTime();
  const openSettlements = settlements.filter((s) => s.status === "awaiting_payment" && (!s.expires_at || new Date(s.expires_at).getTime() > nowMs));
  const dueOutcomes = outcomes.filter((o) => o.status === "payment_due" || o.status === "escrow_pending_funding");

  const byStatus = {};
  for (const e of funded) byStatus[e.status] = (byStatus[e.status] || 0) + 1;

  return {
    grossSales: { amount: sum(released, (e) => num(e.amount)), count: released.length },
    releasedRevenue: { amount: sum(released, escrowNet), count: released.length },
    platformFees: { amount: sum(released, (e) => num(e.commission)), count: released.length },
    escrowHeld: { amount: heldNet, gross: sum(held, (e) => num(e.amount)), count: held.length },
    escrowDisputed: { amount: sum(disputed, escrowNet), count: disputed.length },
    pendingSettlement: {
      amount: sum(openSettlements, (s) => num(s.agreed_amount)) + sum(dueOutcomes, (o) => num(o.winning_amount)),
      offerSettlements: { count: openSettlements.length, amount: sum(openSettlements, (s) => num(s.agreed_amount)) },
      auctionOutcomes: { count: dueOutcomes.length, amount: sum(dueOutcomes, (o) => num(o.winning_amount)) },
    },
    pendingPayout: { amount: pendingPayoutAmount, count: releasedOpen.length, ...pendingParts },
    completedPayout: { amount: sum(paid, (p) => num(p.net_amount)), count: paid.length },
    refunds: { amount: sum(completedRefunds, (r) => num(r.amount)), count: completedRefunds.length, openCount: openRefunds.length, refundedDeals: refundedEscrows.length },
    outstandingReceivables: { amount: heldNet + pendingPayoutAmount },
    transactionVolume: { count: funded.length, gross: sum(funded, (e) => num(e.amount)), byStatus },
    reconciliation: {
      closedWithoutPayout: { count: closedWithoutPayout.length, amount: sum(closedWithoutPayout, escrowNet) },
      escrowCount: escrows.length,
    },
  };
}

export function summariseLeadsAndOffers({ leads = [], offers = [], dealerId, now = new Date() }) {
  const open = leads.filter((l) => !l.archived);
  const nowMs = now.getTime();
  const fresh = open.filter((l) => l.stage === "new");
  const unanswered = fresh.filter((l) => l.first_response_time === null || l.first_response_time === undefined).filter((l) => nowMs - new Date(l.created_at).getTime() > UNANSWERED_AFTER_MS);
  const awaiting = offers.filter((o) => o.status === "pending" && String(o.recipient_id) === String(dealerId) && (!o.expires_at || new Date(o.expires_at).getTime() > nowMs));
  const stages = { new: 0, contacted: 0, negotiating: 0, inspectionBooked: 0, reserved: 0, sold: 0, lost: 0 };
  for (const l of leads) if (Object.prototype.hasOwnProperty.call(stages, l.stage)) stages[l.stage] += 1;
  return { totalLeads: leads.length, newEnquiries: fresh.length, unansweredLeads: unanswered.length, offersAwaitingDecision: awaiting.length, stages };
}

export function summariseAuctions({ cars = [], paidBidStats = new Map(), outcomes = [], now = new Date() }) {
  const nowMs = now.getTime();
  const items = cars.filter((c) => c.auction_status && c.auction_status !== "none").map((c) => {
    const end = c.auction_end ? new Date(c.auction_end).getTime() : null;
    const status = c.auction_status === "live" && end !== null && end <= nowMs ? "ended" : c.auction_status;
    const stat = paidBidStats.get(String(c.id)) || { count: 0, highest: 0 };
    return { id: c.id, title: c.title, status, auctionEnd: c.auction_end || null, validBids: stat.count, highestValidBid: stat.highest || null };
  });
  const count = (s) => items.filter((i) => i.status === s).length;
  const attentionStatuses = new Set(["payment_due", "defaulted", "disputed", "reaward_pending", "escrow_pending_funding"]);
  const outcomeCounts = {};
  for (const o of outcomes) outcomeCounts[o.status] = (outcomeCounts[o.status] || 0) + 1;
  return {
    active: count("live"), upcoming: count("upcoming"), completed: count("ended"), drafts: count("draft"),
    validBids: sum(items.filter((i) => i.status === "live" || i.status === "upcoming"), (i) => i.validBids),
    live: items.filter((i) => i.status === "live").sort((a, b) => new Date(a.auctionEnd || 0) - new Date(b.auctionEnd || 0)).slice(0, 5),
    upcomingList: items.filter((i) => i.status === "upcoming").slice(0, 5),
    endingSoon: items.filter((i) => i.status === "live" && i.auctionEnd && new Date(i.auctionEnd).getTime() > nowMs && new Date(i.auctionEnd).getTime() - nowMs <= DAY_MS).length,
    outcomes: outcomeCounts,
    outcomesRequiringAttention: outcomes.filter((o) => attentionStatuses.has(o.status)).length,
  };
}

export function summariseTeam({ members = [], names = new Map(), events = [], now = new Date() }) {
  const nowMs = now.getTime();
  const invitations = members.filter((m) => m.status === "invited");
  const outstanding = invitations.filter((m) => !m.invite_expires_at || new Date(m.invite_expires_at).getTime() > nowMs);
  const expired = invitations.length - outstanding.length;
  const label = (m) => names.get(String(m.member)) || m.invite_email || "Team member";
  const changes = [...members].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)).slice(0, 8).map((m) => ({
    id: m.id, kind: m.status, role: m.role, at: m.updated_at || m.created_at,
    message: m.status === "invited" ? `Invitation sent to ${m.invite_email || "a team member"} (${m.role})` : m.status === "active" ? `${label(m)} is active as ${m.role}` : m.status === "suspended" ? `${label(m)} was suspended` : `${label(m)} was removed`,
  }));
  const ACTION = { dealer_hide: "paused a listing", dealer_publish: "published a listing", dealer_mark_sold: "marked a vehicle sold", admin_sold_correction: "sale corrected by KAYARD KE staff" };
  const activity = events.slice(0, 8).map((e) => ({
    id: e.id, at: e.created_at, actorType: e.actor_type,
    message: `${e.actor_type === "dealer_staff" ? names.get(String(e.actor_user_id)) || "A team member" : e.actor_type === "dealer_owner" ? "Owner" : e.actor_type === "admin" ? "KAYARD KE staff" : "System"} ${ACTION[e.action] || e.action}`,
  }));
  return {
    outstandingInvitations: outstanding.length, expiredInvitations: expired, activeMembers: members.filter((m) => m.status === "active").length,
    invitations: outstanding.slice(0, 5).map((m) => ({ id: m.id, email: m.invite_email, role: m.role, expiresAt: m.invite_expires_at || null })),
    changes, activity,
  };
}

/** Every item names its real destination (an existing dealer workspace section). Items are only built from sections the caller may see. */
export function buildAttentionQueue({ access, listings, leadStats, financial, team, auctions }) {
  const q = [];
  const add = (id, label, count, severity, section, detail) => { if (count > 0) q.push({ id, label, count, severity, target: { section }, detail }); };
  if (access.leads && leadStats) {
    add("new-enquiries", "New enquiries", leadStats.newEnquiries, "info", "leads");
    add("unanswered-leads", "Enquiries unanswered for over 24 hours", leadStats.unansweredLeads, "warning", "leads");
    add("offers-awaiting", "Offers waiting for your decision", leadStats.offersAwaitingDecision, "warning", "leads", "Open the lead to accept, counter or decline.");
  }
  if (access.inventory && listings) add("pending-listings", "Vehicles pending review", listings.pendingApproval, "warning", "inventory");
  if (access.inventory && listings) add("draft-listings", "Draft listings to finish", listings.draft, "info", "inventory");
  if (access.finance && financial) {
    add("failed-payouts", "Payouts that failed or were cancelled", financial.pendingPayout.failed.count, "critical", "banking");
    add("payouts-not-requested", "Released sales not yet paid out", financial.pendingPayout.notRequested.count, "warning", "banking", "Funds are released; request the payout.");
    add("disputed-escrows", "Sales in dispute", financial.escrowDisputed.count, "critical", "escrow");
    add("open-refunds", "Refunds in progress", financial.refunds.openCount, "warning", "escrow");
  }
  if (access.auctions && auctions) {
    add("auctions-ending-soon", "Auctions ending within 24 hours", auctions.endingSoon || 0, "warning", "auctions");
    add("auction-outcomes", "Auction results needing action", auctions.outcomesRequiringAttention, "critical", "auctions", "Payment due, default, dispute or re-award.");
  }
  if (access.team && team) add("team-invitations", "Team invitations waiting to be accepted", team.outstandingInvitations, "info", "team");
  const order = { critical: 0, warning: 1, info: 2 };
  return q.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------- loading ----------

/** PostgreSQL 42P01 (undefined_table) or PostgREST PGRST205/PGRST200 ("could not find the table ... in the schema cache"). */
export function isMissingRelation(err) {
  const code = String(err?.code || "");
  return code === "42P01" || code === "PGRST205" || /could not find the table|does not exist/i.test(String(err?.message || ""));
}

async function fetchAll(build) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await build().range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export async function loadCommandCentre({ dealerId, org, actorId = null, now = new Date(), days = 30, sb = getSupabase() }) {
  if (!dealerId) throw new Error("dealerId is required");
  const access = resolveAccess(org);
  const truncated = [];
  const grab = async (name, build) => { const r = await fetchAll(build); if (r.truncated) truncated.push(name); return r.rows; };
  // A source table that the connected database does not have yet (migration not applied) must not take the whole overview down, and must never be
  // shown as a confident zero: the source is reported in `unavailable` and the panel hides the figures that depend on it.
  const unavailable = [];
  const optional = async (name, fn, fallback) => { try { return await fn(); } catch (err) { if (isMissingRelation(err)) { unavailable.push(name); return fallback; } throw err; } };

  const needCars = access.inventory || access.auctions || access.leads || access.revenue;
  const cars = needCars ? await grab("cars", () => sb.from("cars").select("id,title,status,sold,approved,deleted_at,views,price,images,auction_status,auction_end,current_bid,bids_count,created_at").eq("dealer_id", dealerId).is("deleted_at", null).order("id")) : [];
  const data = { access, generatedAt: now.toISOString() };

  if (access.inventory) data.listings = summariseListings(cars);

  let leadStats = null; let leads = [];
  if (access.leads) {
    leads = await grab("leads", () => sb.from("leads").select("id,vehicle,stage,archived,first_response_time,created_at,last_activity_at,updated_at").eq("dealer", dealerId).order("id"));
    const offers = await optional("offers", () => grab("offers", () => sb.from("marketplace_offers").select("id,status,recipient_id,expires_at").eq("seller_id", dealerId).eq("status", "pending").order("id")), []);
    leadStats = summariseLeadsAndOffers({ leads, offers, dealerId, now });
    data.leads = leadStats;
    data.pipeline = leadStats.stages;
  }
  let periodEscrows = []; let periodPayouts = [];
  if (access.revenue || access.finance) {
    const escrows = await grab("escrows", () => sb.from("escrows").select('id,car,amount,commission,"sellerAmount",status,"fundedAt","releasedAt"').eq("seller", dealerId).order("id"));
    periodEscrows = escrows;
    if (access.finance) {
      const payouts = await grab("payouts", () => sb.from("dealer_payouts").select("id,escrow,net_amount,status,completed_at").eq("dealer", dealerId).order("id"));
      periodPayouts = payouts;
      const ids = escrows.map((e) => e.id);
      let refunds = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data: r, error } = await sb.from("refunds").select("id,escrow_id,amount,status").in("escrow_id", ids.slice(i, i + 200));
        if (error) throw error;
        refunds = refunds.concat(r || []);
      }
      const settlements = await optional("settlements", () => grab("settlements", () => sb.from("marketplace_offer_settlements").select("id,status,agreed_amount,expires_at").eq("seller_id", dealerId).eq("status", "awaiting_payment").order("id")), []);
      const outcomes = await optional("auction_outcomes", () => grab("auction_outcomes", () => sb.from("auction_outcomes").select("id,status,winning_amount").eq("organizer_id", dealerId).order("id")), []);
      data.financial = summariseFinancials({ escrows, payouts, refunds, settlements, outcomes, now });
      data._outcomes = outcomes;
    } else {
      const full = summariseFinancials({ escrows, now });
      // Members with canViewEarnings already see revenue today; gross, fees, escrow and payouts are owner-only, so they are not exposed.
      data.financial = { releasedRevenue: full.releasedRevenue };
    }
  }

  if (access.auctions) {
    const auctionCars = cars.filter((c) => c.auction_status && c.auction_status !== "none");
    const stats = new Map();
    const ids = auctionCars.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data: bids, error } = await sb.from("bids").select("car_id,amount,status").in("car_id", ids.slice(i, i + 200)).eq("status", "paid");
      if (error) throw error;
      for (const b of bids || []) {
        const s = stats.get(String(b.car_id)) || { count: 0, highest: 0 };
        s.count += 1; s.highest = Math.max(s.highest, num(b.amount)); stats.set(String(b.car_id), s);
      }
    }
    data.auctions = summariseAuctions({ cars: auctionCars, paidBidStats: stats, outcomes: access.finance ? data._outcomes || [] : [], now });
    if (!access.finance) { delete data.auctions.outcomes; data.auctions.outcomesRequiringAttention = 0; }
  }
  delete data._outcomes;

  if (access.team) {
    const members = await grab("team", () => sb.from("dealer_teams").select("id,member,role,status,invite_email,invite_expires_at,created_at,updated_at").eq("dealer", dealerId).order("id"));
    const { data: events, error } = await sb.from("dealer_listing_lifecycle_events").select("id,actor_user_id,actor_type,action,created_at").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(8);
    if (error) { if (isMissingRelation(error)) unavailable.push("team_activity"); else throw error; }
    const userIds = [...new Set([...members.map((m) => m.member), ...(events || []).map((e) => e.actor_user_id)].filter(Boolean))];
    const names = new Map();
    if (userIds.length) {
      const { data: users, error: uErr } = await sb.from("users").select("id,name").in("id", userIds);
      if (uErr) throw uErr;
      for (const u of users || []) names.set(String(u.id), u.name);
    }
    data.team = summariseTeam({ members, names, events: events || [], now });
  }


  // A delegated member sees only their OWN recent authorised activity (never other members'); the owner sees the whole team feed above.
  if (actorId && !access.owner && access.inventory) {
    const { data: mine, error: mineErr } = await sb.from("dealer_listing_lifecycle_events").select("id,action,created_at").eq("dealer_id", dealerId).eq("actor_user_id", actorId).order("created_at", { ascending: false }).limit(8);
    if (mineErr) { if (isMissingRelation(mineErr)) { if (!unavailable.includes("team_activity")) unavailable.push("team_activity"); } else throw mineErr; }
    else data.myActivity = (mine || []).map((e) => ({ id: e.id, action: e.action, at: e.created_at }));
  }

  if (access.inventory || access.leads) {
    data.topPerformers = access.inventory ? buildTopPerformers(cars.map((c) => ({ id: c.id, title: c.title, views: c.views, price: c.price, status: c.status, images: c.images })), leads) : [];
  }
  if (access.leads) {
    data.recentActivity = buildRecentActivity(cars.map((c) => ({ id: c.id, title: c.title })), leads.map((l) => ({ id: l.id, vehicle: l.vehicle, stage: l.stage, lastActivityAt: l.last_activity_at, updatedAt: l.updated_at, createdAt: l.created_at })));
  }

  if (access.leads) {
    const counts = {};
    for (const l of leads) if (!l.archived && l.vehicle) counts[String(l.vehicle)] = (counts[String(l.vehicle)] || 0) + 1;
    data.leadCounts = counts;
  }
  data.period = summarisePeriod({ cars, leads, escrows: periodEscrows, payouts: periodPayouts, access, now, days });
  if (access.inventory) data.health = summariseHealth({ cars });
  data.attention = buildAttentionQueue({ access, listings: data.listings, leadStats, financial: access.finance ? data.financial : null, team: data.team, auctions: data.auctions });
  data.truncated = truncated;
  data.unavailable = unavailable;
  return data;
}
