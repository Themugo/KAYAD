// ONE ACCOUNT, MANY CAPABILITIES. A read-only view over the existing authorities - it never grants, changes or infers anything.
//   buyer            : every active registered account.
//   privateSeller    : private_seller_capabilities (admin-reviewed; pending/rejected/suspended grant nothing).
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
  const active = (user.status || "approved") === "approved";

  const seller = await resolveSellerState({ id: userId, role: user.role, status: user.status });
  const dealerRow = user.role === "dealer" ? null : await findOne("dealers", { user: userId });
  const dealerVerification = dealerRow ? await findOne("dealer_verifications", { user: userId }) : null;
  const inspectorApps = await InspectorApplication.find({ user: userId }).sort({ createdAt: -1 }).lean();
  const inspectorApp = inspectorApps?.[0]?.status || null;

  const dealerApplication = dealerRow ? (dealerVerification?.verificationStatus ?? "draft") : null;
  return {
    userId,
    identity: { role: user.role, status: user.status || "approved", emailVerified: user.emailVerified === true },
    buyer: { granted: !isStaff && active },
    privateSeller: {
      status: seller.status, // none | pending | approved | rejected | suspended | revoked | not_applicable
      granted: seller.status === "approved",
      canApply: user.role === "user" && ["none", "rejected"].includes(seller.status),
    },
    dealer: {
      granted: user.role === "dealer",
      status: BUSINESS_STATUS(user.role === "dealer" && !dealerApplication, dealerApplication),
      canApply: user.role === "user" && !dealerRow,
    },
    inspector: {
      granted: user.role === "ghost_checker",
      status: BUSINESS_STATUS(user.role === "ghost_checker", inspectorApp),
      canApply: user.role === "user" && inspectorApp !== "pending",
    },
  };
}
