// ============================================================
// KAYAD PROVIDER GOVERNANCE
//
// Backend authority for: business verification decisions, credential review,
// capability (declared -> verified -> revoked) decisions, and two-sided staff
// affiliation. Everything runs on the canonical tables:
//   inspection_providers (lifecycle_stage is the single eligibility source;
//   trg_sync_provider_status derives status / verification_status from it),
//   provider_credentials, provider_service_capabilities, inspection_staff.
// Every material decision writes an inspection_status_history audit row
// (entity_type/entity_id) in addition to the admin router's automatic audit log.
// ============================================================

import { getSupabase } from '../../utils/supabase.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';
import {
  getCategory, isHighRiskCategory, isValidCategory, isValidPowertrain, isValidSubcategory,
} from '../config/serviceTaxonomy.js';

const sb = () => getSupabase();
const must = ({ data, error }, message = 'Database operation failed') => {
  if (error) throw new AppError(error.message || message, 500);
  return data;
};

export const VERIFIABLE_FROM = ['UNDER_REVIEW', 'CREDENTIALS_SUBMITTED', 'VERIFIED', 'PROFILE_COMPLETED', 'REGISTERED'];
const ROUTES = ['premises', 'alternative'];

async function audit(entityType, entityId, from, to, actorId, notes) {
  const { error } = await sb().from('inspection_status_history').insert({
    entity_type: entityType, entity_id: entityId, from_status: from ?? null, to_status: to, changed_by: actorId, notes: notes || null,
  });
  if (error) throw new AppError(`Audit write failed: ${error.message}`, 500);
}

const text = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function getProviderRow(providerId) {
  const row = must(await sb().from('inspection_providers').select('*').eq('id', providerId).maybeSingle());
  if (!row) throw new AppError('Provider not found', 404);
  return row;
}

// ---------------------------------------------------------------------------
// Admin: business verification
// ---------------------------------------------------------------------------
export async function adminListProviders({ stage, page = 1, limit = 25 } = {}) {
  let q = sb().from('inspection_providers')
    .select('id,user_id,company_name,trading_name,business_type,email,phone,county,town,address,registration_number,has_workshop,offers_mobile,status,verification_status,lifecycle_stage,verification_route,rejection_reason,info_requested,suspended_reason,reviewed_at,created_at', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (stage) q = q.eq('lifecycle_stage', String(stage));
  const from = (Math.max(page, 1) - 1) * Math.min(limit, 100);
  const { data, error, count } = await q.range(from, from + Math.min(limit, 100) - 1);
  if (error) throw new AppError(error.message, 500);
  return { items: data || [], total: count ?? 0, page: Math.max(page, 1) };
}

export async function adminGetProvider(providerId) {
  const provider = await getProviderRow(providerId);
  const [credentials, capabilities, staff, history] = await Promise.all([
    sb().from('provider_credentials').select('*').eq('provider_id', providerId).order('created_at', { ascending: false }),
    sb().from('provider_service_capabilities').select('*').eq('provider_id', providerId).order('created_at', { ascending: false }),
    sb().from('inspection_staff').select('*').eq('provider_id', providerId),
    sb().from('inspection_status_history').select('*').in('entity_type', ['provider', 'capability', 'credential', 'staff']).order('created_at', { ascending: false }).limit(100),
  ]);
  const ids = new Set([providerId, ...(capabilities.data || []).map((c) => c.id), ...(credentials.data || []).map((c) => c.id), ...(staff.data || []).map((s) => s.id)]);
  return {
    provider,
    credentials: must(credentials), capabilities: must(capabilities), staff: must(staff),
    history: must(history).filter((h) => ids.has(h.entity_id)),
  };
}

export async function adminDecideCredential(adminId, credentialId, { decision, notes }) {
  const cred = must(await sb().from('provider_credentials').select('*').eq('id', credentialId).maybeSingle());
  if (!cred) throw new AppError('Credential not found', 404);
  if (!['verify', 'reject'].includes(decision)) throw new AppError('decision must be verify or reject', 400);
  const note = text(notes);
  if (decision === 'verify') {
    if (!cred.document_url) throw new AppError('A credential without a submitted document cannot be verified', 409);
    if (cred.expires_at && new Date(cred.expires_at).getTime() < Date.now()) throw new AppError('An expired credential cannot be verified', 409);
    if (!note) throw new AppError('Record what was checked in the review notes before verifying', 400);
  }
  const next = decision === 'verify' ? 'verified' : 'rejected';
  must(await sb().from('provider_credentials').update({ verification_status: next, reviewed_by: adminId, reviewed_at: new Date().toISOString(), review_notes: note || null }).eq('id', credentialId));
  await audit('credential', credentialId, cred.verification_status, next, adminId, note);
  return { id: credentialId, verificationStatus: next };
}

/**
 * decision: approve | reject | request_info | suspend | reinstate
 * approve requires recorded evidence: verified credentials appropriate to the route.
 */
export async function adminDecideProvider(adminId, providerId, { decision, route, notes, reason }) {
  const provider = await getProviderRow(providerId);
  if (String(provider.user_id) === String(adminId)) throw new AppError('You cannot decide your own provider application', 403);
  const stage = provider.lifecycle_stage;
  const note = text(notes);
  const now = new Date().toISOString();
  let patch;
  let toStage;

  switch (decision) {
    case 'approve': {
      if (!VERIFIABLE_FROM.includes(stage)) throw new AppError(`A provider in stage ${stage} cannot be approved`, 409);
      if (!ROUTES.includes(route)) throw new AppError("route must be 'premises' or 'alternative'", 400);
      if (!note) throw new AppError('Record the basis for the decision in the notes', 400);
      const creds = must(await sb().from('provider_credentials').select('id,credential_type,verification_status,expires_at').eq('provider_id', providerId));
      const verified = (creds || []).filter((c) => c.verification_status === 'verified' && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()));
      if (!provider.company_name || !(provider.email || provider.phone)) throw new AppError('Business identity and contact details are incomplete', 409);
      if (route === 'premises') {
        if (!provider.address || !(provider.has_workshop)) throw new AppError('The premises route requires a published workshop address', 409);
        if (verified.length < 1) throw new AppError('At least one verified credential is required', 409);
      } else {
        // Evidence-based route for legitimate businesses without customer-facing premises.
        if (!provider.registration_number && !provider.tax_id) throw new AppError('The alternative route requires a business registration or tax identifier', 409);
        if (verified.length < 2) throw new AppError('The alternative route requires at least two verified pieces of evidence', 409);
      }
      toStage = 'ACTIVE';
      patch = { lifecycle_stage: 'ACTIVE', verification_route: route, verification_notes: note, reviewed_by: adminId, reviewed_at: now, verified_at: now, rejection_reason: null, info_requested: null };
      break;
    }
    case 'reject': {
      if (!VERIFIABLE_FROM.includes(stage)) throw new AppError(`A provider in stage ${stage} cannot be rejected`, 409);
      if (!text(reason)) throw new AppError('A reason is required', 400);
      toStage = 'INACTIVE';
      patch = { lifecycle_stage: 'INACTIVE', rejection_reason: text(reason), reviewed_by: adminId, reviewed_at: now, verification_notes: note || provider.verification_notes };
      break;
    }
    case 'request_info': {
      if (!VERIFIABLE_FROM.includes(stage)) throw new AppError(`A provider in stage ${stage} cannot be sent back`, 409);
      if (!text(reason)) throw new AppError('Say what information is needed', 400);
      toStage = 'UNDER_REVIEW';
      patch = { lifecycle_stage: 'UNDER_REVIEW', info_requested: text(reason), info_requested_at: now, reviewed_by: adminId, reviewed_at: now };
      break;
    }
    case 'suspend': {
      if (!['ACTIVE', 'VERIFIED'].includes(stage)) throw new AppError(`A provider in stage ${stage} cannot be suspended`, 409);
      if (!text(reason)) throw new AppError('A reason is required', 400);
      toStage = 'SUSPENDED';
      patch = { lifecycle_stage: 'SUSPENDED', suspended_reason: text(reason), suspended_at: now, suspended_by: adminId };
      break;
    }
    case 'reinstate': {
      if (stage !== 'SUSPENDED') throw new AppError('Only a suspended provider can be reinstated', 409);
      if (provider.verification_status !== 'verified') throw new AppError('Provider is not verified; re-run verification instead', 409);
      toStage = 'ACTIVE';
      patch = { lifecycle_stage: 'ACTIVE', suspended_reason: null, suspended_at: null, suspended_by: null, reviewed_by: adminId, reviewed_at: now };
      break;
    }
    default:
      throw new AppError('Unknown decision', 400);
  }

  // Optimistic concurrency: the update only applies if the stage is still what we read.
  const updated = must(await sb().from('inspection_providers').update(patch).eq('id', providerId).eq('lifecycle_stage', stage).select('id,lifecycle_stage,status,verification_status'));
  if (!updated || updated.length === 0) throw new AppError('The provider changed while you were reviewing it; reload and try again', 409);
  await audit('provider', providerId, stage, toStage, adminId, [decision, route, note, text(reason)].filter(Boolean).join(' | '));
  logInfo('Provider decision', { providerId, decision, adminId });
  return updated[0];
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------
export async function declareCapability(actorId, providerId, input) {
  const { category, subcategory, vehicleMakes, allMakes, powertrains, staffId, evidenceCredentialId, travelsToCustomer } = input || {};
  if (!isValidCategory(category)) throw new AppError('Unknown service category', 400);
  if (!isValidSubcategory(category, subcategory)) throw new AppError('Unknown subcategory for this category', 400);
  const pts = Array.isArray(powertrains) ? powertrains : [];
  if (pts.some((p) => !isValidPowertrain(p))) throw new AppError('Unknown powertrain', 400);
  const makes = Array.isArray(vehicleMakes) ? [...new Set(vehicleMakes.map((m) => text(m, 60)).filter(Boolean))].slice(0, 60) : [];

  const provider = await getProviderRow(providerId);
  if (['SUSPENDED', 'INACTIVE'].includes(provider.lifecycle_stage)) throw new AppError('A suspended or inactive provider cannot change its services', 403);

  if (staffId) {
    const staff = must(await sb().from('inspection_staff').select('id,provider_id,is_active,affiliation_status').eq('id', staffId).maybeSingle());
    if (!staff || String(staff.provider_id) !== String(providerId)) throw new AppError('That person is not part of this business', 400);
    if (!staff.is_active || staff.affiliation_status !== 'confirmed') throw new AppError('That person does not have a confirmed affiliation', 409);
  }
  if (evidenceCredentialId) {
    const cred = must(await sb().from('provider_credentials').select('id,provider_id').eq('id', evidenceCredentialId).maybeSingle());
    if (!cred || String(cred.provider_id) !== String(providerId)) throw new AppError('Evidence must be one of this provider’s credentials', 400);
  }

  const row = {
    provider_id: providerId, staff_id: staffId || null, category_code: category, subcategory_code: subcategory || null,
    vehicle_makes: makes, all_makes: Boolean(allMakes), powertrains: pts,
    serves_roadside_location: Boolean(travelsToCustomer) && getCategory(category)?.travelsToCustomer === true,
    evidence_credential_id: evidenceCredentialId || null, declared_by: actorId,
  };

  const existing = must(await sb().from('provider_service_capabilities').select('*')
    .eq('provider_id', providerId).eq('category_code', category)
    .limit(50));
  const match = (existing || []).find((c) => (c.subcategory_code || null) === (subcategory || null) && (c.staff_id || null) === (staffId || null));

  if (match) {
    // Any change returns the capability to "declared": a verified claim never survives an edit unreviewed.
    const updated = must(await sb().from('provider_service_capabilities')
      .update({ ...row, status: 'declared', reviewed_by: null, reviewed_at: null, review_notes: null, declared_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', match.id).select('*').single());
    await audit('capability', match.id, match.status, 'declared', actorId, `re-declared ${category}`);
    return updated;
  }
  const created = must(await sb().from('provider_service_capabilities').insert({ ...row, status: 'declared' }).select('*').single());
  await audit('capability', created.id, null, 'declared', actorId, `declared ${category}${subcategory ? '/' + subcategory : ''}`);
  return created;
}

export async function listCapabilities(providerId) {
  return must(await sb().from('provider_service_capabilities').select('*').eq('provider_id', providerId).order('created_at', { ascending: true })) || [];
}

export async function adminDecideCapability(adminId, capabilityId, { decision, notes }) {
  if (!['verify', 'revoke'].includes(decision)) throw new AppError('decision must be verify or revoke', 400);
  const cap = must(await sb().from('provider_service_capabilities').select('*').eq('id', capabilityId).maybeSingle());
  if (!cap) throw new AppError('Capability not found', 404);
  const provider = await getProviderRow(cap.provider_id);
  const note = text(notes);
  if (decision === 'verify') {
    if (!isValidCategory(cap.category_code)) throw new AppError('Capability has an unknown category', 409);
    if (provider.verification_status !== 'verified' || provider.lifecycle_stage !== 'ACTIVE') throw new AppError('The business must be verified and active before a capability can be verified', 409);
    if (!note) throw new AppError('Record what was checked in the review notes before verifying', 400);
    if (isHighRiskCategory(cap.category_code)) {
      if (!cap.evidence_credential_id) throw new AppError('High-risk specialties require an attached, verified qualification', 409);
      const cred = must(await sb().from('provider_credentials').select('id,verification_status,expires_at').eq('id', cap.evidence_credential_id).maybeSingle());
      if (!cred || cred.verification_status !== 'verified') throw new AppError('The attached qualification has not been verified', 409);
      if (cred.expires_at && new Date(cred.expires_at).getTime() < Date.now()) throw new AppError('The attached qualification has expired', 409);
    }
    if (cap.staff_id) {
      const staff = must(await sb().from('inspection_staff').select('is_active,affiliation_status').eq('id', cap.staff_id).maybeSingle());
      if (!staff || !staff.is_active || staff.affiliation_status !== 'confirmed') throw new AppError('The person this capability belongs to is not currently affiliated', 409);
    }
  } else if (!note) {
    throw new AppError('A reason is required to revoke', 400);
  }
  const next = decision === 'verify' ? 'verified' : 'revoked';
  const updated = must(await sb().from('provider_service_capabilities')
    .update({ status: next, reviewed_by: adminId, reviewed_at: new Date().toISOString(), review_notes: note, updated_at: new Date().toISOString() })
    .eq('id', capabilityId).eq('status', cap.status).select('*'));
  if (!updated || updated.length === 0) throw new AppError('The capability changed while you were reviewing it; reload and try again', 409);
  await audit('capability', capabilityId, cap.status, next, adminId, note);
  return updated[0];
}

// ---------------------------------------------------------------------------
// Staff affiliation (two-sided consent; admin can end)
// ---------------------------------------------------------------------------
const confirmedNow = (row) => Boolean(row.user_confirmed_at && row.provider_confirmed_at);

async function finalise(row, actorId, note) {
  if (confirmedNow(row) && row.affiliation_status === 'pending') {
    const updated = must(await sb().from('inspection_staff')
      .update({ affiliation_status: 'confirmed', is_active: true, updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('affiliation_status', 'pending').select('*'));
    await audit('staff', row.id, 'pending', 'confirmed', actorId, note);
    return updated?.[0] || row;
  }
  return row;
}

/** A mechanic/inspector asks to be affiliated with a business. Not trusted until the business confirms. */
export async function requestAffiliation(userId, providerId, role) {
  const provider = await getProviderRow(providerId);
  if (provider.lifecycle_stage !== 'ACTIVE') throw new AppError('That business is not currently accepting affiliations', 409);
  if (String(provider.user_id) === String(userId)) throw new AppError('You own this business', 409);
  const user = must(await sb().from('users').select('id,name,status,is_banned').eq('id', userId).maybeSingle());
  if (!user || user.status !== 'approved' || user.is_banned) throw new AppError('Your account is not eligible', 403);
  const live = must(await sb().from('inspection_staff').select('*').eq('provider_id', providerId).eq('user_id', userId).neq('affiliation_status', 'ended').maybeSingle());
  if (live) return live;
  const [first, ...rest] = String(user.name || '').split(' ');
  const created = must(await sb().from('inspection_staff').insert({
    provider_id: providerId, user_id: userId, first_name: first || null, last_name: rest.join(' ') || null, role: text(role, 60) || 'mechanic',
    is_active: false, affiliation_status: 'pending', user_confirmed_at: new Date().toISOString(),
  }).select('*').single());
  await audit('staff', created.id, null, 'pending', userId, 'affiliation requested by the individual');
  return created;
}

/** The business invites a registered user by email. Not trusted until the person accepts. */
export async function inviteStaff(ownerId, providerId, email, role) {
  const provider = await getProviderRow(providerId);
  if (provider.lifecycle_stage !== 'ACTIVE') throw new AppError('Only an active, verified business can add staff', 409);
  const clean = text(email, 254).toLowerCase();
  if (!clean) throw new AppError('Email is required', 400);
  const user = must(await sb().from('users').select('id,name,status,is_banned').ilike('email', clean).maybeSingle());
  if (!user || user.status !== 'approved' || user.is_banned) throw new AppError('No eligible KAYAD account uses that email', 404);
  const live = must(await sb().from('inspection_staff').select('*').eq('provider_id', providerId).eq('user_id', user.id).neq('affiliation_status', 'ended').maybeSingle());
  if (live) return live;
  const [first, ...rest] = String(user.name || '').split(' ');
  const created = must(await sb().from('inspection_staff').insert({
    provider_id: providerId, user_id: user.id, first_name: first || null, last_name: rest.join(' ') || null, role: text(role, 60) || 'mechanic',
    is_active: false, affiliation_status: 'pending', provider_confirmed_at: new Date().toISOString(),
  }).select('*').single());
  await audit('staff', created.id, null, 'pending', ownerId, 'invited by the business');
  return created;
}

export async function acceptAffiliation(userId, staffId) {
  const row = must(await sb().from('inspection_staff').select('*').eq('id', staffId).maybeSingle());
  if (!row || String(row.user_id) !== String(userId)) throw new AppError('Affiliation not found', 404);
  if (row.affiliation_status !== 'pending') throw new AppError(`Affiliation is ${row.affiliation_status}`, 409);
  const stamped = must(await sb().from('inspection_staff').update({ user_confirmed_at: row.user_confirmed_at || new Date().toISOString() }).eq('id', staffId).select('*').single());
  return finalise(stamped, userId, 'accepted by the individual');
}

export async function confirmAffiliationByBusiness(ownerId, providerId, staffId) {
  const row = must(await sb().from('inspection_staff').select('*').eq('id', staffId).maybeSingle());
  if (!row || String(row.provider_id) !== String(providerId)) throw new AppError('Affiliation not found', 404);
  if (row.affiliation_status !== 'pending') throw new AppError(`Affiliation is ${row.affiliation_status}`, 409);
  const provider = await getProviderRow(providerId);
  if (provider.lifecycle_stage !== 'ACTIVE') throw new AppError('Only an active, verified business can confirm staff', 409);
  const stamped = must(await sb().from('inspection_staff').update({ provider_confirmed_at: row.provider_confirmed_at || new Date().toISOString() }).eq('id', staffId).select('*').single());
  return finalise(stamped, ownerId, 'confirmed by the business');
}

/** Ends an affiliation. Their staff-bound capabilities are revoked so the old relationship is never shown as current. */
export async function endAffiliation(actorId, staffId, { providerId } = {}) {
  const row = must(await sb().from('inspection_staff').select('*').eq('id', staffId).maybeSingle());
  if (!row || (providerId && String(row.provider_id) !== String(providerId))) throw new AppError('Affiliation not found', 404);
  if (row.affiliation_status === 'ended') return row;
  const now = new Date().toISOString();
  const updated = must(await sb().from('inspection_staff')
    .update({ affiliation_status: 'ended', is_active: false, affiliation_ended_at: now, affiliation_ended_by: actorId, updated_at: now })
    .eq('id', staffId).neq('affiliation_status', 'ended').select('*'));
  must(await sb().from('provider_service_capabilities')
    .update({ status: 'revoked', reviewed_by: actorId, reviewed_at: now, review_notes: 'Affiliation ended', updated_at: now })
    .eq('staff_id', staffId).neq('status', 'revoked'));
  await audit('staff', staffId, row.affiliation_status, 'ended', actorId, 'affiliation ended');
  return updated?.[0] || row;
}

export async function listStaff(providerId) {
  return must(await sb().from('inspection_staff').select('id,user_id,first_name,last_name,role,is_active,is_available,affiliation_status,user_confirmed_at,provider_confirmed_at,affiliation_ended_at').eq('provider_id', providerId)) || [];
}

export async function listMyAffiliations(userId) {
  const rows = must(await sb().from('inspection_staff').select('id,provider_id,role,is_active,affiliation_status,user_confirmed_at,provider_confirmed_at,affiliation_ended_at').eq('user_id', userId)) || [];
  if (!rows.length) return [];
  const providers = must(await sb().from('inspection_providers').select('id,company_name,trading_name').in('id', rows.map((r) => r.provider_id))) || [];
  const byId = new Map(providers.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, businessName: byId.get(r.provider_id)?.trading_name || byId.get(r.provider_id)?.company_name || null }));
}

export default {
  adminListProviders, adminGetProvider, adminDecideProvider, adminDecideCredential,
  declareCapability, listCapabilities, adminDecideCapability,
  requestAffiliation, inviteStaff, acceptAffiliation, confirmAffiliationByBusiness, endAffiliation, listStaff, listMyAffiliations,
};
