import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const A = "05752bf6-34b9-40e2-8566-68c01f133179";
const state = { reportCount: 1, rpc: [], rpcResult: { data: {}, error: null }, table: {}, inserted: null, updates: [], emitted: [], recent: [] };
const builder = (name) => {
  const b = {
    select: () => b, in: () => b, eq: () => b, lt: () => b, order: () => b, limit: () => b,
    maybeSingle: async () => ({ data: state.table[name] ?? null }),
    single: async () => ({ data: state.inserted, error: null }),
    insert: (row) => { state.inserted = { id: "c1", created_at: new Date().toISOString(), ...row }; return b; },
    update: (row) => { state.updates.push(row); return { eq: async () => ({ error: null }) }; },
    upsert: async () => ({ error: null }), delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    then: (r) => r({ data: name === "auction_comments" ? state.recent : state.table[name] || [], error: null, count: state.reportCount }),
  };
  return b;
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: async (n, a) => { state.rpc.push([n, a]); return state.rpcResult; }, from: builder }) }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => ({ to: () => ({ emit: (e, p) => state.emitted.push([e, p]) }), sockets: { adapter: { rooms: new Map([[`car_${A}`, new Set(["s1", "s2", "s3"])]]) } } }) }));
jest.unstable_mockModule("../../db/index.js", () => ({
  findById: async () => ({ id: A }),
  findOne: async () => ({ publicationStatus: "published", organizerId: "owner1" }),
}));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: { AUCTION_STARTED: "s" } }));
const svc = await import("../../services/auctionEngagement.service.js");

beforeEach(() => { state.rpc = []; state.emitted = []; state.recent = []; state.updates = []; state.table = {}; state.rpcResult = { data: {}, error: null }; });

describe("comment screening (anti-scam)", () => {
  it.each([
    ["call me on 0712 345 678", /Phone|contact/],
    ["see https://evil.example/pay", /Links/],
    ["pay at kayad-deals.com", /Links/],
    ["mail me a@b.co", /Email/],
    ["whatsapp me for a better price", /KAYAD/],
    ["send money first", /KAYAD/],
  ])("rejects %s", (t, re) => expect(svc.commentProblem(t)).toMatch(re));
  it("allows normal talk, short numbers and prices", () => {
    expect(svc.commentProblem("Lovely 2016 cruiser, is the service history complete? 165,000 km is fair")).toBeNull();
  });
});

describe("posting comments", () => {
  it("uses the anonymous bidder ID, never the real name, and broadcasts", async () => {
    const c = await svc.addComment({ auctionId: A, user: { id: "u1", name: "Real Name" }, body: "  Nice <b>car</b>  " });
    expect(c.author).toMatch(/^K-[0-9A-F]{8}$/);
    expect(c.body).toBe("Nice car");
    expect(JSON.stringify(c)).not.toMatch(/Real Name/);
    expect(state.emitted[0][0]).toBe("auctionComment");
  });
  it("the organizer shows as Seller", async () => {
    expect((await svc.addComment({ auctionId: A, user: { id: "owner1" }, body: "Ask me anything" })).author).toBe("Seller");
  });
  it("rejects empty, too long, scam text, and rapid-fire", async () => {
    await expect(svc.addComment({ auctionId: A, user: { id: "u1" }, body: "   " })).rejects.toMatchObject({ status: 422 });
    await expect(svc.addComment({ auctionId: A, user: { id: "u1" }, body: "x".repeat(501) })).rejects.toMatchObject({ status: 422 });
    await expect(svc.addComment({ auctionId: A, user: { id: "u1" }, body: "call 0712345678" })).rejects.toMatchObject({ code: "COMMENT_REJECTED" });
    state.recent = [{ created_at: new Date().toISOString() }];
    await expect(svc.addComment({ auctionId: A, user: { id: "u1" }, body: "hello again" })).rejects.toMatchObject({ status: 429 });
  });
});

describe("moderation", () => {
  it("author removes own; organizer hides; strangers are refused", async () => {
    state.table.auction_comments = { id: "c1", user_id: "u1", status: "visible" };
    await svc.removeComment({ auctionId: A, commentId: "c1", user: { id: "u1" } });
    expect(state.updates.at(-1)).toEqual({ status: "removed" });
    await svc.removeComment({ auctionId: A, commentId: "c1", user: { id: "owner1" } });
    expect(state.updates.at(-1)).toEqual({ status: "hidden" });
    await expect(svc.removeComment({ auctionId: A, commentId: "c1", user: { id: "stranger" } })).rejects.toMatchObject({ status: 403 });
  });
});

describe("visits and live watchers", () => {
  it("counts live watchers from the room, and is stable/anonymous per visitor", () => {
    expect(svc.liveWatchers(A)).toBe(3);
    const h = svc.visitorHash({ auctionId: A, ip: "1.2.3.4", ua: "x" });
    expect(h).toBe(svc.visitorHash({ auctionId: A, ip: "1.2.3.4", ua: "x" }));
    expect(h).not.toContain("1.2.3.4");
    expect(h).not.toBe(svc.visitorHash({ auctionId: A, ip: "5.6.7.8", ua: "x" }));
  });
  it("ignores bots, records people", async () => {
    expect((await svc.recordVisit({ auctionId: A, ip: "1", ua: "Googlebot" })).recorded).toBe(false);
    expect(state.rpc).toHaveLength(0);
    expect((await svc.recordVisit({ auctionId: A, ip: "1", ua: "Mozilla/5.0" })).recorded).toBe(true);
    expect(state.rpc[0][0]).toBe("kayad_record_auction_visit");
  });
  it("engagement fails soft (zeros, enabled:false) before the migration exists", async () => {
    state.rpcResult = { data: null, error: { message: "function does not exist" } };
    const e = await svc.getEngagement({ auctionId: A });
    expect(e).toMatchObject({ enabled: false, follows: 0, watchers: 3 });
  });
});

describe("owner insights", () => {
  it("only owner or staff; includes funnel percentages", async () => {
    state.rpcResult = { data: { follows: 5, likes: 2, comments: 1, visits: 90, unique_visitors: 40, peak_watchers: 12, registered: 8, bidders: 4, daily: [{ day: "2026-11-04", visits: 90, unique: 40 }] }, error: null };
    await expect(svc.getInsights({ auctionId: A, user: { id: "stranger", role: "buyer" } })).rejects.toMatchObject({ status: 403 });
    const i = await svc.getInsights({ auctionId: A, user: { id: "owner1", role: "dealer" } });
    expect(i.totals).toMatchObject({ peakWatchers: 12, liveWatchers: 3, uniqueVisitors: 40 });
    expect(i.funnel.find((f) => f.key === "bidders")).toMatchObject({ value: 4, pct: 10 });
    expect((await svc.getInsights({ auctionId: A, user: { id: "x", role: "admin" } })).daily).toHaveLength(1);
  });
});

describe("reporting comments", () => {
  it("one report only records; the third distinct report hides the comment live", async () => {
    state.table.auction_comments = { id: "c1", user_id: "author", status: "visible" };
    state.reportCount = 1;
    expect(await svc.reportComment({ auctionId: A, commentId: "c1", user: { id: "r1" }, reason: "spam" })).toEqual({ reported: true, hidden: false });
    state.reportCount = 3;
    expect(await svc.reportComment({ auctionId: A, commentId: "c1", user: { id: "r3" } })).toEqual({ reported: true, hidden: true });
    expect(state.updates.at(-1)).toEqual({ status: "hidden" });
    expect(state.emitted.at(-1)[0]).toBe("auctionCommentRemoved");
  });
  it("cannot report your own comment; hidden comments are gone", async () => {
    state.table.auction_comments = { id: "c1", user_id: "me", status: "visible" };
    await expect(svc.reportComment({ auctionId: A, commentId: "c1", user: { id: "me" } })).rejects.toMatchObject({ status: 422 });
    state.table.auction_comments = { id: "c1", user_id: "x", status: "hidden" };
    await expect(svc.reportComment({ auctionId: A, commentId: "c1", user: { id: "r1" } })).rejects.toMatchObject({ status: 404 });
  });
  it("moderation queue is staff only", async () => {
    await expect(svc.listReportedComments({ user: { id: "u", role: "buyer" } })).rejects.toMatchObject({ status: 403 });
    expect(await svc.listReportedComments({ user: { id: "s", role: "admin" } })).toEqual([]);
  });
});
