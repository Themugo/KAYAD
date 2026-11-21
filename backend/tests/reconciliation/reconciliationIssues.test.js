import { jest } from "@jest/globals";
import { isIssueResolved, issuesOf, groupRowsByReport, tallyBy, sumDirectional } from "../../utils/reconciliationIssues.js";

describe("reconciliationIssues helpers (GAP-ESC-OPS)", () => {
  test("resolved only when exactly true", () => {
    expect(isIssueResolved({ resolved: true })).toBe(true);
    expect(isIssueResolved({ resolved: "true" })).toBe(true);
    for (const v of [false, "false", 1, "yes", null, undefined]) expect(isIssueResolved({ resolved: v })).toBe(false);
    expect(isIssueResolved({})).toBe(false);
    for (const v of [null, "x", 5, [], undefined]) expect(isIssueResolved(v)).toBe(false);
  });
  test("issuesOf tolerates null, missing, malformed and non-object elements", () => {
    expect(issuesOf(null)).toEqual([]);
    expect(issuesOf({})).toEqual([]);
    expect(issuesOf({ issues: null })).toEqual([]);
    expect(issuesOf({ issues: { a: 1 } })).toEqual([]);
    expect(issuesOf({ issues: [1, "x", null, [], { type: "a" }] })).toEqual([{ type: "a" }]);
  });
  test("groupRowsByReport keeps order and groups", () => {
    const g = groupRowsByReport([
      { reportUuid: "a", reportId: "A", issue: { n: 1 } },
      { reportUuid: "b", reportId: "B", issue: { n: 2 } },
      { reportUuid: "a", reportId: "A", issue: { n: 3 } },
    ]);
    expect(g.map((r) => [r.id, r.issues.length])).toEqual([["a", 2], ["b", 1]]);
  });
  test("tallyBy reports missing as unknown", () => {
    expect(tallyBy([{ issue: { severity: "high" } }, { issue: {} }, { issue: { severity: "" } }], "severity")).toEqual({ high: 1, unknown: 2 });
  });
  test("sumDirectional ignores non-numeric values", () => {
    const s = sumDirectional([{ matched: 2, overpaid: "x", financials: { overpaidTotal: 10 } }, { matched: 3, financials: null }, {}]);
    expect(s.totalMatched).toBe(5);
    expect(s.totalOverpaid).toBe(0);
    expect(s.overpaidAmount).toBe(10);
    expect(s.underpaidAmount).toBe(0);
  });
});
