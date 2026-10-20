// ============================================================
// KAYAD GARAGE ORGANIZATION ROUTES — mounted at /api/inspections/org   (Stage 5F.16)
//
//   /me/*                          the signed-in person's own memberships, invitations and inspector worklist
//   /:providerId/...               organization-scoped, capability-gated by requireOrgAccess (standing recomputed per request)
//
// Authorization is layered: (1) requireAuth, (2) requireOrgAccess(capability) — DB standing, uniform 404 for strangers,
// (3) the `kayad_org_*` PostgreSQL function re-verifies the precise per-row authority (role rank, branch scope, self-change)
// inside the same transaction as the write. The organization id in the URL is the only organization identifier ever used; a body
// that tries to supply organizationId / role-authority fields fails strict validation.
// ============================================================
import express from 'express';
import asyncHandler from '../../middleware/asyncHandler.js';
import { response } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import requireOrgAccess, { requireUuidParams } from '../middleware/requireOrgAccess.js';
import * as org from '../services/organizationService.js';
import {
  branchCreateSchema, branchUpdateSchema, branchStatusSchema, memberInviteSchema, memberChangeSchema, memberStatusSchema, leaveSchema,
  bookingRouteSchema, bookingAssignSchema, bookingTransitionSchema, reportQuerySchema, bookingListQuerySchema,
} from '../../validation/garageOrganization.schema.js';

const router = express.Router();
const parseQuery = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.query);
  if (!r.success) return next(new AppError('Invalid query: ' + Object.keys(r.error.flatten().fieldErrors).join(', '), 400));
  req.parsedQuery = r.data;
  return next();
};
const actor = (req) => req.user.id;

// ---------------------------------------------------------------- the signed-in person
router.get('/me/memberships', requireAuth, asyncHandler(async (req, res) => {
  response.success(res, { memberships: await org.listMyMemberships(actor(req)) });
}));
router.get('/me/worklist', requireAuth, asyncHandler(async (req, res) => {
  response.success(res, await org.myWorklist(actor(req), { status: typeof req.query.status === 'string' ? req.query.status.slice(0, 40) : undefined }));
}));
// Accepting is bound to the invited user inside the database; anybody else (including the owner) gets "not found".
router.post('/me/memberships/:staffId/accept', requireAuth, csrfProtection, requireUuidParams('staffId'), asyncHandler(async (req, res) => {
  response.success(res, await org.acceptInvitation(actor(req), req.params.staffId));
}));
// A person may decline a pending invitation or leave an active membership. They can never end anybody else's.
router.post('/me/memberships/:staffId/leave', requireAuth, csrfProtection, requireUuidParams('staffId'), validate(leaveSchema), asyncHandler(async (req, res) => {
  response.success(res, await org.setMemberStatus(actor(req), req.params.staffId, 'revoke', req.body.reason || 'left the organization', 'self'));
}));

// ---------------------------------------------------------------- organization
const guard = (cap) => [requireAuth, requireOrgAccess(cap)];
router.get('/:providerId', ...guard('org.read'), asyncHandler(async (req, res) => {
  response.success(res, await org.getOrganization(req.org.providerId, req.org.standing));
}));

// branches
router.get('/:providerId/branches', ...guard('branch.read'), asyncHandler(async (req, res) => {
  response.success(res, { branches: await org.listBranches(req.org.providerId, req.org.standing) });
}));
router.post('/:providerId/branches', ...guard('branch.manage'), csrfProtection, validate(branchCreateSchema), asyncHandler(async (req, res) => {
  response.created(res, await org.createBranch(actor(req), req.org.providerId, req.body));
}));
router.patch('/:providerId/branches/:branchId', ...guard('branch.manage'), csrfProtection, requireUuidParams('branchId'), validate(branchUpdateSchema), asyncHandler(async (req, res) => {
  await org.assertBranchInOrg(req.org.providerId, req.params.branchId);
  const b = req.body; const patch = {};
  for (const [k, col] of [['name', 'name'], ['county', 'county'], ['town', 'town'], ['address', 'address'], ['phone', 'phone'], ['latitude', 'latitude'], ['longitude', 'longitude']]) if (k in b) patch[col] = b[k];
  response.success(res, await org.updateBranch(actor(req), req.params.branchId, patch));
}));
router.post('/:providerId/branches/:branchId/status', ...guard('branch.manage'), csrfProtection, requireUuidParams('branchId'), validate(branchStatusSchema), asyncHandler(async (req, res) => {
  await org.assertBranchInOrg(req.org.providerId, req.params.branchId);
  response.success(res, await org.setBranchStatus(actor(req), req.params.branchId, req.body.status, req.body.reason));
}));

// team
router.get('/:providerId/members', ...guard('member.read'), asyncHandler(async (req, res) => {
  response.success(res, { members: await org.listMembers(req.org.providerId, req.org.standing) });
}));
router.post('/:providerId/members/invite', ...guard('member.manage'), csrfProtection, validate(memberInviteSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  response.created(res, await org.inviteMember(actor(req), req.org.providerId, { email: b.email, accessRole: b.accessRole, title: b.title, branchId: b.branchId, ttlHours: b.expiresInHours }));
}));
router.post('/:providerId/members/:staffId/confirm', ...guard('member.manage'), csrfProtection, requireUuidParams('staffId'), asyncHandler(async (req, res) => {
  await org.assertMemberInOrg(req.org.providerId, req.params.staffId);
  response.success(res, await org.confirmMember(actor(req), req.params.staffId));
}));
router.patch('/:providerId/members/:staffId', ...guard('member.manage'), csrfProtection, requireUuidParams('staffId'), validate(memberChangeSchema), asyncHandler(async (req, res) => {
  await org.assertMemberInOrg(req.org.providerId, req.params.staffId);
  const patch = {};
  if ('accessRole' in req.body) patch.access_role = req.body.accessRole;
  if ('title' in req.body) patch.tech_role = req.body.title;
  if ('branchId' in req.body) patch.branch_id = req.body.branchId;
  response.success(res, await org.changeMember(actor(req), req.params.staffId, patch));
}));
router.post('/:providerId/members/:staffId/status', ...guard('member.manage'), csrfProtection, requireUuidParams('staffId'), validate(memberStatusSchema), asyncHandler(async (req, res) => {
  await org.assertMemberInOrg(req.org.providerId, req.params.staffId);
  response.success(res, await org.setMemberStatus(actor(req), req.params.staffId, req.body.action, req.body.reason));
}));

// bookings: routing, assignment, execution
router.get('/:providerId/bookings', ...guard('booking.read'), parseQuery(bookingListQuerySchema), asyncHandler(async (req, res) => {
  response.success(res, await org.listBookings(req.org.providerId, req.org.standing, req.parsedQuery));
}));
router.post('/:providerId/bookings/:bookingId/route', ...guard('booking.manage'), csrfProtection, requireUuidParams('bookingId'), validate(bookingRouteSchema), asyncHandler(async (req, res) => {
  await org.assertBookingInOrg(req.org.providerId, req.params.bookingId);
  response.success(res, await org.routeBooking(actor(req), req.params.bookingId, req.body.branchId));
}));
router.post('/:providerId/bookings/:bookingId/assign', ...guard('booking.manage'), csrfProtection, requireUuidParams('bookingId'), validate(bookingAssignSchema), asyncHandler(async (req, res) => {
  await org.assertBookingInOrg(req.org.providerId, req.params.bookingId);
  response.success(res, await org.assignBooking(actor(req), req.params.bookingId, req.body.staffId));
}));
router.post('/:providerId/bookings/:bookingId/transition', ...guard('booking.execute'), csrfProtection, requireUuidParams('bookingId'), validate(bookingTransitionSchema), asyncHandler(async (req, res) => {
  await org.assertBookingInOrg(req.org.providerId, req.params.bookingId);
  response.success(res, await org.transitionBooking(actor(req), req.params.bookingId, req.body.action, req.body.notes));
}));

// consolidated reporting (scope and sections are decided by the database from the caller's role)
router.get('/:providerId/report', ...guard('report.read'), parseQuery(reportQuerySchema), asyncHandler(async (req, res) => {
  response.success(res, await org.getReport(actor(req), req.org.providerId, req.parsedQuery));
}));

export default router;
