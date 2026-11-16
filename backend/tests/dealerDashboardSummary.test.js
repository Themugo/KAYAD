import { describe, it, expect } from "vitest";
import { listingStatusBreakdown, buildTopPerformers, buildRecentActivity } from "../services/dealerDashboardSummary.js";

const listings = [
  { id: "a", title: "2019 Prado", status: "available", views: 40, price: 4500000, images: [{ url: "https://x.test/a1.jpg" }, { url: "https://x.test/a2.jpg" }] },
  { id: "b", title: "2020 Hilux", status: "pending", views: 90, price: 5200000, images: ["https://x.test/b1.jpg"] },
  { id: "c", title: "2018 Axio", status: "sold", views: 5, price: 900000, images: [] },
  { id: "d", title: "Draft car", status: "draft", views: 0, price: 1 },
];
const leads = [
  { id: "l1", vehicle: "a", stage: "new", createdAt: "2026-11-10T08:00:00Z", lastActivityAt: "2026-11-12T10:00:00Z" },
  { id: "l2", vehicle: "a", stage: "negotiating", createdAt: "2026-11-01T08:00:00Z", lastActivityAt: "2026-11-14T09:00:00Z" },
  { id: "l3", vehicle: "b", stage: "contacted", createdAt: "2026-11-13T08:00:00Z" },
];

describe("dealer dashboard summary (real data only)", () => {
  it("breaks listings down by real status", () => {
    expect(listingStatusBreakdown(listings)).toEqual({ available: 1, pending: 1, reserved: 0, sold: 1, hidden: 0, draft: 1 });
    expect(listingStatusBreakdown([{ status: "active" }]).available).toBe(1);
    expect(listingStatusBreakdown([])).toEqual({ available: 0, pending: 0, reserved: 0, sold: 0, hidden: 0, draft: 0 });
  });

  it("ranks by views and attaches the real photo and real enquiry count", () => {
    const top = buildTopPerformers(listings, leads);
    expect(top.map((v) => v.id)).toEqual(["b", "a", "c", "d"]);
    expect(top[0]).toMatchObject({ image: "https://x.test/b1.jpg", leads: 1, status: "pending" });
    expect(top[1]).toMatchObject({ image: "https://x.test/a1.jpg", leads: 2 });
    expect(top[2].image).toBeNull();
    expect(buildTopPerformers(listings, leads, 2)).toHaveLength(2);
  });

  it("derives activity only from the dealer's leads, newest first, and is empty when there are none", () => {
    const act = buildRecentActivity(listings, leads);
    expect(act.map((a) => a.id)).toEqual(["l2", "l3", "l1"]);
    expect(act[0].message).toBe("Negotiation in progress · 2019 Prado");
    expect(act[0].vehicleId).toBe("a");
    expect(buildRecentActivity(listings, [])).toEqual([]);
    expect(buildRecentActivity([], [{ id: "x", stage: "weird", createdAt: "2026-11-01T00:00:00Z" }])[0].message).toBe("Lead update");
  });
});
