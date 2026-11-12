// ONE ACCOUNT, MANY CAPABILITIES. A read-only view over the existing authorities - it never grants, changes or infers anything.
//   personal         : the ONE personal account (every active registered account): `buying` for every account and `selling` (private
//                      seller, policy-controlled) as a capability of the same account. `buyer` / `privateSeller` are deprecated aliases.
//   privateSeller    : policy-controlled. Default mode is free/open with no seller approval; suspension/revocation remain enforceable. When approval is enabled, capability status is authoritative.
//   dealer           : users.role === "dealer" (set only by administrator approval); the dealers/dealer_verifications rows are the
//                      application, separate from the identity.
//   inspector        : users.role === "ghost_checker" (set only by administrator approval); InspectorApplication is the application.
// A pending or rejected business application never reduces the buyer or private-seller entries.
import { findOne } from "../db/index.js";
import InspectorApplication from "../models/InspectorApplication.js";
import { resolveSellerState } from "./privateSellerCapability.service.js";

const BUSINESS_STATUS = (granted, application) => (granted ? "approved" : application || "none");

export async function getAccountCapabilities(user) {
  const userId = String(user.id ?? user._id);
  const isStaff = !["user", "dealer", "ghost_checker", "individual_seller"].includes(user.role);
  const isPersonalIdentity = user.role === "user" || user.role === "individual_seller"; // individual_seller: retired legacy rows
  const seller = await resolveSellerState({ id: userId, role: user.role, status: user.status });
  // Legacy individual_seller identities were marked pending solely by the old seller-approval workflow.
  // Under the free default policy they remain active personal accounts; the forward migration also normalizes
  // this persisted status so routes using requireApproved see the same result after rollout.
  // Legacy individual_seller accounts used users.status='pending' only as the old
  // seller-approval marker. That marker must not remove the independent buyer capability.
  // Seller suspension/revocation is enforced by sellerListingAccess, not by buyer access.
  const active = (user.status || "approved") === "approved"
    || (user.role === "individual_seller" && user.status === "pending");
  const dealerRow = user.role === "dealer" ? null : await findOne("dealers", { user: userId });
  const dealerVerification = dealerRow ? await findOne("dealer_verifications", { user: userId }) : null;
  const inspectorApps = await InspectorApplication.find({ user: userId }).sort({ createdAt: -1 }).lean();
  const inspectorApp = inspectorApps?.[0]?.status || null;

  const dealerApplication = dealerRow ? (dealerVerification?.verificationStatus ?? "draft") : null;
  return {
    userId,
    identity: { role: user.role, status: user.status || "approved", emailVerified: user.emailVerified === true },
    // ONE personal account holds both functions. `personal` is the canonical shape; `buyer` and `privateSeller` below are
    // DEPRECATED aliases kept only for existing API clients (legacy semantics, never a second identity).
    // A dealer is a SEPARATE account type (own registration, verification and workspace), so it is never reported as a personal account.
    personal: {
      granted: isPersonalIdentity && active,
      buying: { granted: isPersonalIdentity && active },
      selling: {
        status: seller.status, // none | pending | approved | rejected | suspended | revoked | not_applicable
        granted: seller.status === "approved",
        canApply: user.role === "user" && ["none", "rejected"].includes(seller.status),
      },
    },
    buyer: { granted: !isStaff && active, deprecated: true, replacedBy: "personal.buying" },
    privateSeller: {
      status: seller.status,
      granted: seller.status === "approved",
      canApply: user.role === "user" && ["none", "rejected"].includes(seller.status),
      deprecated: true,
      replacedBy: "personal.selling",
    },
    dealer: {
      granted: user.role === "dealer",
      status: BUSINESS_STATUS(user.role === "dealer" && !dealerApplication, dealerApplication),
      canApply: false, // a dealer is a separate business account: no personal account can apply to become one
    },
    inspector: {
      granted: user.role === "ghost_checker",
      status: BUSINESS_STATUS(user.role === "ghost_checker", inspectorApp),
      canApply: user.role === "user" && inspectorApp !== "pending",
    },
  };
}
