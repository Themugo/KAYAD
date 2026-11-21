// Regression (Supabase reconciliation 2026-10-11): db-layer column names must match the migrated schema.
// The expected camelCase escrow columns are the real columns of public.escrows in a full replay of supabase/migrations
// (see docs/audits/evidence/supabase-reconciliation-20261011/repo-inventory.json).
import { describe, it, expect } from "@jest/globals";
import { mapKeyOut } from "../../utils/fieldMap.js";

const ESCROW_CAMEL_COLUMNS = ["autoReleaseEligibleAt", "closedAt", "createdAt", "deliveredAt", "disputeAppeal", "disputeAssignedTo",
  "disputeCategory", "disputeChatId", "disputeDescription", "disputeEvidence", "disputeInspectionId", "disputeInternalNotes",
  "disputeLastActionKey", "disputeMediation", "disputePriority", "disputeReason", "disputeResolution", "disputeTimeline",
  "disputeTitle", "disputeWorkflowStatus", "disputedAt", "disputedBy", "fundedAt", "lastActionKey", "refundedAt", "refundedBy",
  "releasedAt", "releasedBy", "sellerAmount", "updatedAt", "vehicleConfirmedAt"];

describe("fieldMap vs migrated schema", () => {
  it.each(ESCROW_CAMEL_COLUMNS)("escrows.%s maps to its real camelCase column", (col) => {
    expect(mapKeyOut("escrows", col)).toBe(col);
  });
  it("escrows.warningSent is intentionally left unaliased (escrow cron stays dormant pending owner decision FIN-1)", () => {
    // If this starts failing, someone aliased it: confirm the auto-release dry-run and owner sign-off first.
    expect(mapKeyOut("escrows", "warningSent")).toBe("warning_sent");
  });
  it("notifications.isRead maps to the real `read` column (no is_read column exists)", () => {
    expect(mapKeyOut("notifications", "isRead")).toBe("read");
    expect(mapKeyOut("notifications", "read")).toBe("read");
    expect(mapKeyOut("notifications", "user")).toBe("user_id");
  });
});
