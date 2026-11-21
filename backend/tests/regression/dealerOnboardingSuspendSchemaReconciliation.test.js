// Regression (dealer-platform convergence mission, gap register R12/R14):
// guards against exactly the class of defect these two fixes closed -
// application code writing a column/value the live schema doesn't accept.
// R12: PUT /dealer/onboarding writes bio/paymentDetails/onboardingComplete/
// onboardingCompletedAt to `dealers`, which had no such columns.
// R14: transitionDealerVerification writes verificationStatus:"suspended",
// which the live CHECK constraint didn't allow.
// Both are now fixed by additive migrations; this test asserts the
// migration content and the application code stay in lock-step, so a
// future change to either side that reopens the mismatch fails CI instead
// of failing silently against the live database the way both originally did.
import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERIFICATION_STATUSES } from "../../services/dealerVerificationService.js";
import { mapKeyOut } from "../../utils/fieldMap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../../../supabase/migrations");

const r12Migration = fs.readFileSync(
  path.join(migrationsDir, "20261012140000_dealer_onboarding_columns_r12.sql"),
  "utf8"
);
const r14Migration = fs.readFileSync(
  path.join(migrationsDir, "20261012140100_dealer_verification_suspended_status_r14.sql"),
  "utf8"
);

describe("R12 — dealers onboarding columns migration matches what the app writes", () => {
  const ONBOARDING_FIELDS = ["bio", "paymentDetails", "onboardingComplete", "onboardingCompletedAt"];

  it.each(ONBOARDING_FIELDS)("the camelCase field %s maps to a snake_case column the R12 migration adds", (field) => {
    const column = mapKeyOut("dealers", field);
    expect(r12Migration).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`));
  });

  it("the migration is purely additive (ADD COLUMN IF NOT EXISTS only, no DROP/ALTER of existing columns)", () => {
    expect(r12Migration).not.toMatch(/DROP COLUMN|ALTER COLUMN|RENAME COLUMN/i);
    expect(r12Migration.match(/ADD COLUMN IF NOT EXISTS/g)?.length).toBe(4);
  });
});

describe("R14 — dealer_verifications CHECK constraint matches VERIFICATION_STATUSES", () => {
  it("every value in VERIFICATION_STATUSES is present in the R14 migration's allowed list", () => {
    for (const status of VERIFICATION_STATUSES) {
      expect(r14Migration).toContain(`'${status}'`);
    }
  });

  it("VERIFICATION_STATUSES has exactly 4 values (pending/approved/rejected/suspended) — if this grows, the migration must grow with it", () => {
    expect(VERIFICATION_STATUSES).toEqual(["pending", "approved", "rejected", "suspended"]);
  });

  it("the migration drops the constraint IF EXISTS first (safe to rerun on a database in any prior state)", () => {
    expect(r14Migration).toMatch(/DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check/);
  });

  it("the migration does not touch any column other than re-defining the status CHECK constraint", () => {
    expect(r14Migration).not.toMatch(/ADD COLUMN|DROP COLUMN|ALTER COLUMN/i);
  });
});
