// ============================================================
// KAYAD AUTOMOTIVE SERVICES - taxonomy, capability, affiliation and admin governance controllers
// ============================================================
import asyncHandler from '../../middleware/asyncHandler.js';
import { response } from '../../utils/response.js';
import { getTaxonomy } from '../config/serviceTaxonomy.js';
import { getSupabase } from '../../utils/supabase.js';
import * as gov from '../services/providerGovernanceService.js';

export const getServiceTaxonomy = asyncHandler(async (req, res) => {
  response.success(res, getTaxonomy());
});

// ---- provider-owner (requireProviderOwnership already ran) ----
export const listCapabilities = asyncHandler(async (req, res) => {
  response.success(res, { capabilities: await gov.listCapabilities(req.params.providerId) });
});
export const declareCapability = asyncHandler(async (req, res) => {
  response.created(res, await gov.declareCapability(req.user.id, req.params.providerId, req.body));
});
export const listStaff = asyncHandler(async (req, res) => {
  response.success(res, { staff: await gov.listStaff(req.params.providerId) });
});
export const inviteStaff = asyncHandler(async (req, res) => {
  response.created(res, await gov.inviteStaff(req.user.id, req.params.providerId, req.body.email, req.body.role));
});
export const confirmStaff = asyncHandler(async (req, res) => {
  response.success(res, await gov.confirmAffiliationByBusiness(req.user.id, req.params.providerId, req.params.staffId));
});
export const endStaff = asyncHandler(async (req, res) => {
  response.success(res, await gov.endAffiliation(req.user.id, req.params.staffId, { providerId: req.params.providerId }));
});

// ---- the individual (any authenticated user, acting only on their own affiliations) ----
export const requestAffiliation = asyncHandler(async (req, res) => {
  response.created(res, await gov.requestAffiliation(req.user.id, req.body.providerId, req.body.role));
});
export const myAffiliations = asyncHandler(async (req, res) => {
  response.success(res, { affiliations: await gov.listMyAffiliations(req.user.id) });
});
export const acceptAffiliation = asyncHandler(async (req, res) => {
  response.success(res, await gov.acceptAffiliation(req.user.id, req.params.staffId));
});
export const leaveAffiliation = asyncHandler(async (req, res) => {
  // A person may end their own affiliation; ownership of the row is verified here.
  const mine = await gov.listMyAffiliations(req.user.id);
  const row = mine.find((a) => String(a.id) === String(req.params.staffId));
  if (!row) return response.error(res, 'Affiliation not found', 404);
  response.success(res, await gov.endAffiliation(req.user.id, req.params.staffId));
});

// ---- admin ----
export const adminList = asyncHandler(async (req, res) => {
  response.success(res, await gov.adminListProviders({ stage: req.query.stage, page: req.query.page, limit: req.query.limit }));
});
export const adminGet = asyncHandler(async (req, res) => {
  response.success(res, await gov.adminGetProvider(req.params.id));
});
export const adminProviderDecision = asyncHandler(async (req, res) => {
  response.success(res, await gov.adminDecideProvider(req.user.id, req.params.id, req.body));
});
export const adminCredentialDecision = asyncHandler(async (req, res) => {
  response.success(res, await gov.adminDecideCredential(req.user.id, req.params.id, req.body));
});
export const adminCapabilityDecision = asyncHandler(async (req, res) => {
  response.success(res, await gov.adminDecideCapability(req.user.id, req.params.id, req.body));
});
export const adminEndStaff = asyncHandler(async (req, res) => {
  response.success(res, await gov.endAffiliation(req.user.id, req.params.id));
});

// ---- the signed-in user's own business, if any ----
export const myProvider = asyncHandler(async (req, res) => {
  const { data, error } = await getSupabase()
    .from('inspection_providers')
    .select('id,company_name,trading_name,lifecycle_stage,verification_route,rejection_reason,info_requested,suspended_reason,registration_number,has_workshop,address')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  response.success(res, { provider: (data && data[0]) || null });
});
