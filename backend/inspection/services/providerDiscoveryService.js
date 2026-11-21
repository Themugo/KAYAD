// ============================================================
// KAYAD PROVIDER DISCOVERY - eligibility-enforcing, capability-aware search
//
// Rules (all enforced here, on the server, regardless of what the client sends):
//  * Only providers with status 'active' AND verification_status 'verified' AND
//    lifecycle_stage 'ACTIVE' are ever returned. The client cannot widen this.
//  * A capability is "verified" only when an administrator verified it. Declared
//    capabilities are returned labelled as declared, and are NEVER matched for
//    high-risk categories (hybrid / EV high-voltage work).
//  * Staff-bound capabilities count only while that person's affiliation is
//    confirmed and active.
//  * Distance is a straight-line figure computed from real stored coordinates
//    and is only returned when both points exist. No ETA, no guaranteed coverage.
//  * Public rows never contain coordinates, documents, review notes or evidence.
// ============================================================

import { getSupabase } from '../../utils/supabase.js';
import { isHighRiskCategory, isValidCategory, isValidSubcategory, isValidPowertrain } from '../config/serviceTaxonomy.js';

const PROVIDER_COLUMNS = [
  'id', 'company_name', 'trading_name', 'logo_url', 'country', 'county', 'town', 'latitude', 'longitude',
  'service_radius_km', 'years_in_business', 'average_rating', 'reviews_count', 'total_reviews',
  'total_completed_inspections', 'response_time_minutes', 'languages', 'has_workshop', 'offers_mobile',
  'mobile_inspection_fee', 'weekend_available', 'same_day_available', 'vehicle_types', 'inspection_types',
  'commercial_vehicles', 'electric_vehicles', 'luxury_vehicles', 'verification_status', 'status',
  'lifecycle_stage', 'starting_price', 'verified_at',
].join(',');

const CANDIDATE_LIMIT = 500;

export const isEligibleProviderRow = (p) =>
  Boolean(p) && p.status === 'active' && p.verification_status === 'verified' && p.lifecycle_stage === 'ACTIVE';

const toRad = (d) => (d * Math.PI) / 180;
export function haversineKm(lat1, lon1, lat2, lon2) {
  // Number(null) is 0, which would fabricate a point at (0,0): reject missing values explicitly.
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined || v === '')) return null;
  const nums = [lat1, lon1, lat2, lon2].map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [a1, o1, a2, o2] = nums;
  const dLat = toRad(a2 - a1);
  const dLon = toRad(o2 - o1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a1)) * Math.cos(toRad(a2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const escapeLike = (v) => String(v).replace(/[\\%_]/g, '\\$&');
const lower = (v) => String(v || '').trim().toLowerCase();
const asArray = (v) => (Array.isArray(v) ? v : []);

/** Which of a provider's capability rows are currently usable (staff-bound ones need a live affiliation). */
function usableCapabilities(rows, staffById) {
  return rows.filter((c) => {
    if (c.status === 'revoked') return false;
    if (!c.staff_id) return true;
    const s = staffById.get(c.staff_id);
    return Boolean(s) && s.is_active !== false && s.affiliation_status === 'confirmed';
  });
}

/** Does this capability satisfy the requested vehicle / location constraints? */
function capabilityMatches(cap, { category, subcategory, make, powertrain, roadside }) {
  if (cap.category_code !== category) return false;
  if (subcategory && cap.subcategory_code && cap.subcategory_code !== subcategory) return false;
  if (isHighRiskCategory(category) && cap.status !== 'verified') return false;
  if (make) {
    const makes = asArray(cap.vehicle_makes).map(lower);
    if (!cap.all_makes && !makes.includes(lower(make))) return false;
  }
  if (powertrain) {
    const pts = asArray(cap.powertrains).map(lower);
    if (!pts.includes(lower(powertrain))) return false;
  }
  if (roadside && !cap.serves_roadside_location) return false;
  return true;
}

export function publicCapability(cap) {
  return {
    category: cap.category_code,
    subcategory: cap.subcategory_code || null,
    status: cap.status === 'verified' ? 'verified' : 'declared',
    vehicleMakes: cap.all_makes ? 'all' : asArray(cap.vehicle_makes),
    powertrains: asArray(cap.powertrains),
    travelsToCustomer: Boolean(cap.serves_roadside_location),
    individual: Boolean(cap.staff_id),
  };
}

export async function searchEligibleProviders(raw = {}) {
  const f = normaliseFilters(raw);
  const sb = getSupabase();

  let q = sb
    .from('inspection_providers')
    .select(PROVIDER_COLUMNS)
    .eq('status', 'active')
    .eq('verification_status', 'verified')
    .eq('lifecycle_stage', 'ACTIVE')
    .limit(CANDIDATE_LIMIT);
  if (f.country) q = q.eq('country', f.country);
  if (f.county) q = q.ilike('county', escapeLike(f.county));
  if (f.town) q = q.ilike('town', escapeLike(f.town));
  if (f.mobileOnly) q = q.eq('offers_mobile', true);
  if (f.workshopOnly) q = q.eq('has_workshop', true);
  if (f.sameDayAvailable) q = q.eq('same_day_available', true);
  if (f.weekendAvailable) q = q.eq('weekend_available', true);
  if (f.commercialVehicles) q = q.eq('commercial_vehicles', true);
  if (f.luxuryVehicles) q = q.eq('luxury_vehicles', true);
  const { data: providers, error } = await q;
  if (error) throw error;

  // Defence in depth: never trust the query alone for eligibility.
  const candidates = (providers || []).filter(isEligibleProviderRow);
  const ids = candidates.map((p) => p.id);

  let capsByProvider = new Map();
  let staffById = new Map();
  if (ids.length) {
    const [capRes, staffRes] = await Promise.all([
      sb.from('provider_service_capabilities')
        .select('id,provider_id,staff_id,category_code,subcategory_code,status,vehicle_makes,all_makes,powertrains,serves_roadside_location')
        .in('provider_id', ids).neq('status', 'revoked'),
      sb.from('inspection_staff').select('id,provider_id,is_active,affiliation_status').in('provider_id', ids),
    ]);
    if (capRes.error) throw capRes.error;
    if (staffRes.error) throw staffRes.error;
    staffById = new Map((staffRes.data || []).map((s) => [s.id, s]));
    for (const c of capRes.data || []) {
      if (!capsByProvider.has(c.provider_id)) capsByProvider.set(c.provider_id, []);
      capsByProvider.get(c.provider_id).push(c);
    }
  }

  const wantsCategory = Boolean(f.category);
  const constraints = { category: f.category, subcategory: f.subcategory, make: f.make, powertrain: f.powertrain, roadside: f.category === 'roadside_recovery' && f.atVehicleLocation };
  const hasPoint = Number.isFinite(f.nearLat) && Number.isFinite(f.nearLng);

  const rows = [];
  for (const p of candidates) {
    const caps = usableCapabilities(capsByProvider.get(p.id) || [], staffById);
    if (wantsCategory && !caps.some((c) => capabilityMatches(c, constraints))) continue;
    if (f.verifiedOnly && wantsCategory && !caps.some((c) => c.status === 'verified' && capabilityMatches(c, constraints))) continue;

    const distanceKm = hasPoint ? haversineKm(f.nearLat, f.nearLng, p.latitude, p.longitude) : null;
    const radius = Number(p.service_radius_km);
    // Coverage is only claimed for providers that travel, have a stored radius and a computable distance.
    const withinServiceRadius = distanceKm !== null && p.offers_mobile && Number.isFinite(radius) && radius > 0 ? distanceKm <= radius : null;
    if (constraints.roadside && withinServiceRadius !== true) continue;
    if (f.withinServiceRadius && withinServiceRadius !== true) continue;
    if (f.maxDistanceKm && (distanceKm === null || distanceKm > f.maxDistanceKm)) continue;

    rows.push({ p, caps, distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10, withinServiceRadius });
  }

  rows.sort((a, b) => {
    if (hasPoint) {
      const da = a.distanceKm ?? Infinity; const db = b.distanceKm ?? Infinity;
      if (da !== db) return da - db;
    }
    const va = a.caps.some((c) => c.status === 'verified') ? 1 : 0;
    const vb = b.caps.some((c) => c.status === 'verified') ? 1 : 0;
    if (va !== vb) return vb - va;
    return String(a.p.company_name).localeCompare(String(b.p.company_name));
  });

  const total = rows.length;
  const start = (f.page - 1) * f.limit;
  const items = rows.slice(start, start + f.limit).map(({ p, caps, distanceKm, withinServiceRadius }) => toPublicItem(p, caps, distanceKm, withinServiceRadius));
  return { items, total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) };
}

function toPublicItem(p, caps, distanceKm, withinServiceRadius) {
  const reviews = Number(p.total_reviews ?? p.reviews_count ?? 0);
  return {
    id: p.id,
    companyName: p.company_name,
    tradingName: p.trading_name,
    logo: p.logo_url,
    location: { country: p.country, county: p.county, town: p.town },
    businessHours: {},
    operatingModel: {
      hasWorkshop: Boolean(p.has_workshop),
      offersMobile: Boolean(p.offers_mobile),
      mobileFee: Number(p.mobile_inspection_fee || 0),
      weekendAvailable: Boolean(p.weekend_available),
      sameDayAvailable: Boolean(p.same_day_available),
    },
    // Provider-declared attributes. The UI must label these as declared.
    specializations: {
      vehicleTypes: p.vehicle_types || [],
      inspectionTypes: p.inspection_types || [],
      commercialVehicles: Boolean(p.commercial_vehicles),
      electricVehicles: Boolean(p.electric_vehicles),
      luxuryVehicles: Boolean(p.luxury_vehicles),
    },
    experience: { yearsInBusiness: Number(p.years_in_business || 0) },
    verification: { status: 'verified', verifiedAt: p.verified_at || null },
    capabilities: caps.map(publicCapability),
    // Straight-line figure from stored coordinates, or null. Never an ETA.
    distanceKm,
    withinServiceRadius,
    stats: {
      // Zero reviews means "no rating yet", not a rating of 0.
      averageRating: reviews > 0 ? Number(p.average_rating || 0) : null,
      totalReviews: reviews,
      completedInspections: Number(p.total_completed_inspections || 0),
      responseTimeMinutes: p.response_time_minutes == null ? null : Number(p.response_time_minutes),
      acceptanceRate: null,
    },
    packages: [],
    startingPrice: p.starting_price == null ? null : Number(p.starting_price),
  };
}

export function normaliseFilters(raw) {
  const num = (v) => (v === undefined || v === null || v === '' ? NaN : Number(v));
  const bool = (v) => v === true || v === 'true' || v === '1';
  const category = isValidCategory(raw.category) ? raw.category : null;
  const sub = category && isValidSubcategory(category, raw.subcategory) && raw.subcategory ? String(raw.subcategory) : null;
  const lat = num(raw.nearLat);
  const lng = num(raw.nearLng);
  const validPoint = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return {
    // status / verified from the client are intentionally NOT read.
    country: raw.country ? String(raw.country).slice(0, 60) : null,
    county: raw.county ? String(raw.county).slice(0, 60) : null,
    town: raw.town ? String(raw.town).slice(0, 60) : null,
    mobileOnly: bool(raw.mobileOnly),
    workshopOnly: bool(raw.workshopOnly),
    sameDayAvailable: bool(raw.sameDayAvailable),
    weekendAvailable: bool(raw.weekendAvailable),
    commercialVehicles: bool(raw.commercialVehicles),
    luxuryVehicles: bool(raw.luxuryVehicles),
    category,
    subcategory: sub,
    make: raw.make ? String(raw.make).trim().slice(0, 60) : null,
    powertrain: isValidPowertrain(raw.powertrain) ? raw.powertrain : null,
    atVehicleLocation: bool(raw.atVehicleLocation),
    verifiedOnly: bool(raw.verifiedOnly),
    nearLat: validPoint ? lat : NaN,
    nearLng: validPoint ? lng : NaN,
    withinServiceRadius: bool(raw.withinServiceRadius),
    maxDistanceKm: Number.isFinite(num(raw.maxDistanceKm)) && num(raw.maxDistanceKm) > 0 ? Math.min(num(raw.maxDistanceKm), 500) : null,
    page: Math.max(parseInt(raw.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(raw.limit, 10) || 20, 1), 50),
  };
}

export default { searchEligibleProviders, isEligibleProviderRow, haversineKm, publicCapability, normaliseFilters };
