import { createModel } from "./_base.js";

const RefreshToken = createModel("RefreshToken");

// The generic factory (createModel) only provides generic CRUD methods.
// controllers/authController.js calls 3 static methods on RefreshToken
// that don't exist anywhere in this codebase - revokeToken (called
// during every login/register/refresh as part of token rotation),
// revokeAllForUser (called on logout and "log out all devices"), and
// getActiveSessions (the "manage your sessions" list). Confirmed via a
// direct grep before implementing anything: no other file defines
// them, and _base.js's factory doesn't provide them generically either.
// Unlike a similar gap found earlier in services/leadService.js's
// updateLeadStage/createActivity (left unimplemented and flagged
// instead, since "what should a CRM stage transition validate" is
// genuinely ambiguous business logic), these 3 are standard,
// unambiguous session-management operations with a clear intended
// behavior, so implemented directly rather than just flagged.

// Revokes one specific refresh token (used during token rotation - the
// old token is revoked once a new one is issued). Scoped to userId as
// well as the token value itself, so one user can never revoke
// another's token even if they somehow obtained the token string.
RefreshToken.revokeToken = async (token, userId) => {
  if (!token) return null;
  return RefreshToken.findOneAndUpdate({ token, user: userId }, { isRevoked: true });
};

// Revokes every active refresh token for a user - "log out all
// devices". actorId is accepted (matching every call site's existing
// 2-argument signature) for future audit-logging use, but the revoke
// itself is scoped to userId regardless of who triggered it.
RefreshToken.revokeAllForUser = async (userId, actorId) => {
  return RefreshToken.updateMany({ user: userId, isRevoked: false }, { $set: { isRevoked: true } });
};

// Lists a user's active (non-revoked) sessions for a "manage your
// devices" view. Strips the actual token value from every row before
// returning - this is a session list, not something that should ever
// expose a live, usable refresh token to the client that's just asking
// to see its own session list.
RefreshToken.getActiveSessions = async (userId) => {
  const sessions = await RefreshToken.find({ user: userId, isRevoked: false }).lean();
  return sessions.map(({ token, ...safe }) => safe);
};

export default RefreshToken;
