// backend/inspection/middleware/requireOrgAccess.js — Stage 5F.16
//
// Per-request authority for /api/inspections/org/:providerId/*.
//   * The caller's standing is recomputed from the DATABASE on every request (never from the JWT, a cookie or the request body),
//     so a member who is suspended, revoked, banned or moved off an active branch loses access on their very next call,
//     even with a still-valid session token.
//   * A caller with no standing gets the SAME 404 as a non-existent organization: the route does not reveal which
//     organizations exist.
//   * A caller whose role lacks the capability gets 403 (they already know the organization exists).
//   * Platform administrators get no implicit operational access here; they use the admin provider-governance routes.
import { AppError } from '../../utils/AppError.js';
import { getStanding, can } from '../services/organizationService.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID.test(v);

export const requireOrgAccess = (capability) => async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new AppError('Authentication required', 401));
    const { providerId } = req.params;
    if (!isUuid(providerId)) return next(new AppError('Organization not found', 404));
    const standing = await getStanding(providerId, req.user.id);
    if (!standing) return next(new AppError('Organization not found', 404));
    if (!can(standing, capability)) return next(new AppError('Your role does not allow this action', 403, { code: 'ORG_FORBIDDEN' }));
    req.org = { providerId, standing };
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Validates :branchId / :staffId / :bookingId path params as UUIDs (anything else is a 404, not a database error). */
export const requireUuidParams = (...names) => (req, res, next) => {
  for (const n of names) if (!isUuid(req.params[n])) return next(new AppError('Not found', 404));
  return next();
};

export default requireOrgAccess;
