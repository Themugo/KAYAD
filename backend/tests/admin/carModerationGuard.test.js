// ============================================================
// STAGE 7 ADMIN/OPERATIONS PRIVILEGE-BOUNDARY — car moderation guard.
//
// POST /api/admin/cars/:id/moderate had no precondition against mutating an
// already-sold car's status, letting admin/superadmin (or any staff role
// with MANAGE_CARS permission) re-list a completed sale as 'available'
// while payment/escrow/ownership records still showed it sold. See
// backend/utils/carModerationGuard.js for the full rationale.
// ============================================================

import { describe, test, expect } from "@jest/globals";
import { moderationBlockedReason } from "../../utils/carModerationGuard.js";

describe("moderationBlockedReason()", () => {
  test("blocks a car whose status is 'sold'", () => {
    const reason = moderationBlockedReason({ status: "sold" });
    expect(reason).toEqual(expect.stringContaining("already been sold"));
  });

  test("blocks a car whose `sold` boolean is true even if status lags behind", () => {
    const reason = moderationBlockedReason({ status: "available", sold: true });
    expect(reason).toEqual(expect.stringContaining("already been sold"));
  });

  test("allows moderation of a pending (not-yet-sold) listing", () => {
    expect(moderationBlockedReason({ status: "pending", sold: false })).toBeNull();
  });

  test("allows moderation of a rejected listing being reconsidered", () => {
    expect(moderationBlockedReason({ status: "rejected", sold: false })).toBeNull();
  });

  test("is safe against a missing car (caller already 404s separately)", () => {
    expect(moderationBlockedReason(null)).toBeNull();
    expect(moderationBlockedReason(undefined)).toBeNull();
  });
});
