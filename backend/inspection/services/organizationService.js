// ============================================================
// KAYAD GARAGE ORGANIZATION SERVICE — organization → branches → staff memberships (Stage 5F.16)
//
// Every mutation and every authority decision is made INSIDE PostgreSQL by the `kayad_org_*` functions
// (migration 20261020180000). This module only:
//   1. translates HTTP input to function arguments (never trusting a client-supplied actor, role or organization),
//   2. maps `ORG_*` failures to stable HTTP statuses without leaking internals,
//   3. serves scoped READS using the standing the database reports for the caller (`kayad_org_context`).
// The actor is always `req.user.id` from the verified session; the role is recomputed from the database on each call.
// ============================================================
import { getSupabase } from '../../utils/supabase.js';
import { AppError } from '../../utils/AppError.js';

/** ORG_* domain code → HTTP status. Anything unlisted that starts with ORG_ is a 409 (state conflict). */
export const ORG_STATUS = Object.freeze({
  ORG_FORBIDDEN: 403, ORG_SELF_CHANGE_FORBIDDEN: 403, ORG_HEAD_OFFICE_PROTECTED: 409,
  ORG_NOT_FOUND: 404, ORG_BRANCH_NOT_FOUND: 404,
  ORG_INVALID: 400, ORG_INVALID_INSPECTOR: 409, ORG_USER_NOT_ELIGIBLE: 404,
  ORG_INVITATION_EXPIRED: 410,
});

export const ORG_ACCESS_ROLES = Object.freeze(['org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician', 'finance', 'report_reviewer']);
export const TECH_TITLES = Object.freeze(['lead_engineer', 'senior_inspector', 'junior_inspector', 'field_technician', 'workshop_technician', 'quality_reviewer']);
export const DEFAULT_TITLE = 'junior_inspector';

/** Legacy `inspection_staff.role` title → least-privilege access role (used by the legacy affiliation endpoints). */
export const accessRoleForTitle = (title) => {
  if (title === 'quality_reviewer') return 'report_reviewer';
  if (title === 'field_technician' || title === 'workshop_technician') return 'technician';
  return 'inspector';
};
/** Normalises a client-supplied technical title. Unknown values are a 400, never silently coerced into a privileged role. */
export const normaliseTitle = (title) => {
  if (title === undefined || title === null || String(title).trim() === '') return DEFAULT_TITLE;
  const t = String(title).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!TECH_TITLES.includes(t)) throw new AppError(`Unknown role title. Use one of: ${TECH_TITLES.join(', ')}`, 400);
  return t;
};

const parseOrgError = (error) => {
  const msg = String(error?.message || '');
  const m = msg.match(/\b(ORG_[A-Z_]+)\s*:\s*(.*)$/s);
  return m ? { code: m[1], message: m[2].split('\n')[0].trim() } : null;
};

/** Calls a SECURITY DEFINER org function as service_role and maps the outcome to AppError. */
export async function orgRpc(name, args) {
  const { data, error } = await getSupabase().rpc(name, args);
  if (!error) {
    // The few functions that report an expected business outcome in-band (e.g. an expired invitation) say ok:false.
    if (data && typeof data === 'object' && data.ok === false && typeof data.code === 'string') {
      throw new AppError(data.code === 'ORG_INVITATION_EXPIRED' ? 'This invitation has expired. Ask for a new one.' : 'The request could not be completed', ORG_STATUS[data.code] || 409, { code: data.code });
    }
    return data;
  }
  const parsed = parseOrgError(error);
  if (parsed) throw new AppError(parsed.message || 'The request could not be completed', ORG_STATUS[parsed.code] || 409, { code: parsed.code });
  // Anything else (connectivity, programming error) is an infrastructure failure: never echo database text to the client.
  throw new AppError('The organization service is temporarily unavailable', 500, { rpc: name, pgCode: error.code || 'UNKNOWN' });
}

const sb = () => getSupabase();
const must = ({ data, error }, what = 'query') => {
  if (error) throw new AppError(`Could not load ${what}`, 500, { pgCode: error.code || 'UNKNOWN' });
  return data;
};

// ---------------------------------------------------------------- standing
/** The caller's current standing in this organization, recomputed from the database. null = no standing (identical for "no such org"). */
export async function getStanding(providerId, userId) {
  if (!userId) return null;
  const rows = must(await sb().rpc('kayad_org_context', { p_provider: providerId, p_user: userId }), 'organization standing');
  const r = Array.isArray(rows) ? rows[0] : rows;
  if (!r) return null;
  return { isOwner: !!r.is_owner, accessRole: r.access_role, branchId: r.branch_id || null, staffId: r.staff_id || null };
}

/** Capability → roles allowed to reach the endpoint. The database re-checks the precise per-row authority. */
export const CAPABILITIES = Object.freeze({
  'org.read': ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance', 'report_reviewer', 'inspector', 'technician'],
  'branch.read': ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance', 'report_reviewer', 'inspector', 'technician'],
  'branch.manage': ['owner', 'org_admin'],
  'member.read': ['owner', 'org_admin', 'operations_manager', 'branch_manager'],
  'member.manage': ['owner', 'org_admin', 'branch_manager'],
  'booking.read': ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'report_reviewer', 'inspector', 'technician'],
  'booking.manage': ['owner', 'org_admin', 'operations_manager', 'branch_manager'],
  'booking.execute': ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician'],
  'report.read': ['owner', 'org_admin', 'operations_manager', 'branch_manager', 'finance'],
});
export const roleKey = (standing) => (standing?.isOwner ? 'owner' : standing?.accessRole || null);
export const can = (standing, capability) => !!standing && (CAPABILITIES[capability] || []).includes(roleKey(standing));

// ---------------------------------------------------------------- organization overview
export async function getOrganization(providerId, standing) {
  const p = must(await sb().from('inspection_providers').select('id,company_name,trading_name,status,verification_status,lifecycle_stage').eq('id', providerId).maybeSingle(), 'organization');
  if (!p) throw new AppError('Organization not found', 404);
  return {
    id: p.id, name: p.trading_name || p.company_name, status: p.status, verificationStatus: p.verification_status, lifecycleStage: p.lifecycle_stage,
    you: { role: roleKey(standing), branchId: standing.branchId, staffId: standing.staffId, isOwner: standing.isOwner },
  };
}

// ---------------------------------------------------------------- branches
const BRANCH_COLS = 'id,provider_id,name,county,town,address,phone,latitude,longitude,status,is_head_office,status_reason,created_at,updated_at';
export async function listBranches(providerId, standing) {
  let q = sb().from('inspection_branches').select(BRANCH_COLS).eq('provider_id', providerId).order('is_head_office', { ascending: false }).order('name');
  if (standing.branchId) q = q.eq('id', standing.branchId);            // branch-scoped roles see only their own branch
  return must(await q, 'branches') || [];
}
/** Public: the active branches a customer may choose when booking. Only non-sensitive location fields; only for a live, verified provider. */
export async function listPublicBranches(providerId) {
  const prov = must(await sb().from('inspection_providers').select('id,status,verification_status,lifecycle_stage').eq('id', providerId).maybeSingle(), 'provider');
  if (!prov || prov.status !== 'active' || prov.verification_status !== 'verified') return [];
  return must(await sb().from('inspection_branches').select('id,name,county,town,is_head_office').eq('provider_id', providerId).eq('status', 'active').order('is_head_office', { ascending: false }).order('name'), 'branches') || [];
}
export const createBranch = (actor, providerId, b) => orgRpc('kayad_org_branch_create', {
  p_actor: actor, p_provider: providerId, p_name: b.name, p_county: b.county ?? null, p_town: b.town ?? null, p_address: b.address ?? null,
  p_phone: b.phone ?? null, p_lat: b.latitude ?? null, p_lng: b.longitude ?? null, p_head: !!b.isHeadOffice,
});
export const updateBranch = (actor, branchId, patch) => orgRpc('kayad_org_branch_update', { p_actor: actor, p_branch: branchId, p_patch: patch });
export const setBranchStatus = (actor, branchId, status, reason) => orgRpc('kayad_org_branch_set_status', { p_actor: actor, p_branch: branchId, p_status: status, p_reason: reason ?? '' });

/** Branch must belong to the organization in the URL, or the route is a 404 (prevents "right org, wrong branch" IDOR before the RPC). */
export async function assertBranchInOrg(providerId, branchId) {
  const row = must(await sb().from('inspection_branches').select('id').eq('id', branchId).eq('provider_id', providerId).maybeSingle(), 'branch');
  if (!row) throw new AppError('Branch not found', 404);
}
export async function assertMemberInOrg(providerId, staffId) {
  const row = must(await sb().from('inspection_staff').select('id').eq('id', staffId).eq('provider_id', providerId).maybeSingle(), 'member');
  if (!row) throw new AppError('Member not found', 404);
}
export async function assertBookingInOrg(providerId, bookingId) {
  const row = must(await sb().from('inspection_bookings').select('id').eq('id', bookingId).eq('provider_id', providerId).maybeSingle(), 'booking');
  if (!row) throw new AppError('Booking not found', 404);
}

// ---------------------------------------------------------------- team
const MEMBER_COLS = 'id,user_id,first_name,last_name,role,access_role,branch_id,is_active,is_available,affiliation_status,invitation_expires_at,user_confirmed_at,provider_confirmed_at,affiliation_ended_at,status_reason,created_at';
export async function listMembers(providerId, standing) {
  let q = sb().from('inspection_staff').select(MEMBER_COLS).eq('provider_id', providerId).order('created_at');
  if (standing.branchId) q = q.eq('branch_id', standing.branchId);     // a branch manager sees their branch only
  const rows = must(await q, 'team') || [];
  // Branch managers must not see org-level people even if one is somehow branch-tagged; org roles are never branch-scoped (DB check).
  return rows.map((r) => ({
    id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null, title: r.role, accessRole: r.access_role, branchId: r.branch_id,
    status: r.affiliation_status, isActive: r.is_active, isAvailable: r.is_available, invitationExpiresAt: r.invitation_expires_at,
    awaiting: r.affiliation_status === 'pending' ? (r.user_confirmed_at && !r.provider_confirmed_at ? 'business' : 'member') : null,
    reason: r.status_reason, endedAt: r.affiliation_ended_at,
  }));
}

/** Resolve an invitee by e-mail on the server. The same 404 is returned for "unknown" and "ineligible" so the endpoint is not an account-existence oracle. */
export async function inviteMember(actor, providerId, { email, accessRole, title, branchId, ttlHours }) {
  const clean = String(email || '').trim().toLowerCase();
  const user = must(await sb().from('users').select('id').ilike('email', clean).maybeSingle(), 'invitee');
  if (!user) throw new AppError('No eligible KAYAD account uses that email', 404, { code: 'ORG_USER_NOT_ELIGIBLE' });
  return orgRpc('kayad_org_member_invite', {
    p_actor: actor, p_provider: providerId, p_user: user.id, p_access_role: accessRole, p_tech_role: title ?? null, p_branch: branchId ?? null,
    p_ttl_hours: Math.min(Math.max(Number(ttlHours) || 168, 1), 720),
  });
}
export const acceptInvitation = (userId, staffId) => orgRpc('kayad_org_member_accept', { p_user: userId, p_staff: staffId });
export const confirmMember = (actor, staffId) => orgRpc('kayad_org_member_confirm', { p_actor: actor, p_staff: staffId });
export const changeMember = (actor, staffId, patch) => orgRpc('kayad_org_member_change', { p_actor: actor, p_staff: staffId, p_patch: patch });
export const setMemberStatus = (actor, staffId, action, reason, authority = 'org') => orgRpc('kayad_org_member_set_status', { p_actor: actor, p_staff: staffId, p_action: action, p_reason: reason ?? null, p_authority: authority });

/** The signed-in person's own memberships across organizations (invitations to accept, current standing). */
export async function listMyMemberships(userId) {
  const rows = must(await sb().from('inspection_staff').select('id,provider_id,role,access_role,branch_id,affiliation_status,is_active,invitation_expires_at,status_reason').eq('user_id', userId).order('created_at', { ascending: false }), 'memberships') || [];
  if (!rows.length) return [];
  const providers = must(await sb().from('inspection_providers').select('id,company_name,trading_name').in('id', [...new Set(rows.map((r) => r.provider_id))]), 'organizations') || [];
  const branches = rows.some((r) => r.branch_id) ? (must(await sb().from('inspection_branches').select('id,name').in('id', rows.filter((r) => r.branch_id).map((r) => r.branch_id)), 'branches') || []) : [];
  const pById = new Map(providers.map((p) => [p.id, p])); const bById = new Map(branches.map((b) => [b.id, b]));
  const now = Date.now();
  return rows.map((r) => ({
    id: r.id, organizationId: r.provider_id, organizationName: pById.get(r.provider_id)?.trading_name || pById.get(r.provider_id)?.company_name || null,
    accessRole: r.access_role, title: r.role, branchId: r.branch_id, branchName: r.branch_id ? bById.get(r.branch_id)?.name || null : null,
    status: r.affiliation_status, isActive: r.is_active, reason: r.status_reason,
    invitationExpired: r.affiliation_status === 'pending' && r.invitation_expires_at ? new Date(r.invitation_expires_at).getTime() < now : false,
    invitationExpiresAt: r.invitation_expires_at,
  }));
}

// ---------------------------------------------------------------- bookings
const BOOKING_COLS = 'id,booking_reference,provider_id,branch_id,status,scheduled_date,scheduled_time,assigned_staff_id,vehicle_make,vehicle_model,vehicle_year,inspection_town,is_mobile,payment_status,total_price,currency,created_at';
/** Rows the caller may see: managers → org/branch; report_reviewer → org/branch; inspector/technician → only their own assignments. Finance → none. */
export async function listBookings(providerId, standing, { status, branchId, date, page = 1, limit = 25 } = {}) {
  const role = roleKey(standing);
  if (!can(standing, 'booking.read')) throw new AppError('Organization not found', 404);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100); const pg = Math.max(parseInt(page, 10) || 1, 1);
  let q = sb().from('inspection_bookings').select(BOOKING_COLS, { count: 'exact' }).eq('provider_id', providerId);
  if (role === 'inspector' || role === 'technician') q = q.eq('assigned_staff_id', standing.staffId);
  else if (standing.branchId) q = q.eq('branch_id', standing.branchId);
  else if (branchId === 'unrouted') q = q.is('branch_id', null);
  else if (branchId) q = q.eq('branch_id', branchId);
  if (status) q = q.eq('status', status);
  if (date) q = q.eq('scheduled_date', date);
  const { data, error, count } = await q.order('scheduled_date').order('scheduled_time').range((pg - 1) * lim, pg * lim - 1);
  if (error) throw new AppError('Could not load bookings', 500, { pgCode: error.code || 'UNKNOWN' });
  return { items: data || [], total: count ?? (data || []).length, page: pg, limit: lim };
}
export const routeBooking = (actor, bookingId, branchId) => orgRpc('kayad_org_booking_route', { p_actor: actor, p_booking: bookingId, p_branch: branchId ?? null });
export const assignBooking = (actor, bookingId, staffId) => orgRpc('kayad_org_booking_assign', { p_actor: actor, p_booking: bookingId, p_staff: staffId });
export const transitionBooking = (actor, bookingId, action, notes) => orgRpc('kayad_org_booking_transition', { p_actor: actor, p_booking: bookingId, p_action: action, p_notes: notes ?? null });

/** The signed-in inspector's own worklist across every organization where they hold a LIVE membership. */
export async function myWorklist(userId, { status } = {}) {
  const mine = must(await sb().from('inspection_staff').select('id,provider_id,branch_id').eq('user_id', userId).eq('affiliation_status', 'confirmed').eq('is_active', true).in('access_role', ['inspector', 'technician']), 'memberships') || [];
  if (!mine.length) return { items: [], memberships: 0 };
  // a membership tied to a suspended/closed branch is not live
  const bIds = [...new Set(mine.filter((m) => m.branch_id).map((m) => m.branch_id))];
  const live = bIds.length ? new Set((must(await sb().from('inspection_branches').select('id').in('id', bIds).eq('status', 'active'), 'branches') || []).map((b) => b.id)) : new Set();
  const staffIds = mine.filter((m) => !m.branch_id || live.has(m.branch_id)).map((m) => m.id);
  if (!staffIds.length) return { items: [], memberships: 0 };
  let q = sb().from('inspection_bookings').select(BOOKING_COLS).in('assigned_staff_id', staffIds);
  if (status) q = q.eq('status', status);
  const rows = must(await q.order('scheduled_date').order('scheduled_time').limit(100), 'worklist') || [];
  return { items: rows, memberships: staffIds.length };
}

// ---------------------------------------------------------------- consolidated reporting
export function reportRange(from, to) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);      // Africa/Nairobi (UTC+3, no DST)
  const first = `${today.slice(0, 8)}01`;
  const f = from && re.test(from) ? from : first; const t = to && re.test(to) ? to : today;
  if (f > t) throw new AppError('The start date must not be after the end date', 400);
  if ((Date.parse(t) - Date.parse(f)) / 86400000 > 366) throw new AppError('Reports cover at most 366 days', 400);
  return { from: f, to: t };
}
export async function getReport(actor, providerId, { branchId, from, to }) {
  const r = reportRange(from, to);
  return { period: r, ...(await orgRpc('kayad_org_report', { p_actor: actor, p_provider: providerId, p_branch: branchId || null, p_from: r.from, p_to: r.to })) };
}

export default {
  getStanding, can, roleKey, getOrganization, listBranches, listPublicBranches, createBranch, updateBranch, setBranchStatus, assertBranchInOrg, assertMemberInOrg, assertBookingInOrg,
  listMembers, inviteMember, acceptInvitation, confirmMember, changeMember, setMemberStatus, listMyMemberships,
  listBookings, routeBooking, assignBooking, transitionBooking, myWorklist, getReport, reportRange,
};
