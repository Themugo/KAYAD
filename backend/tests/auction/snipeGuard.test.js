import { applySnipingProtection } from "../../utils/snipeGuard.js";

// Env defaults (no overrides in test): snipe window 120 s,
// extension 120 s, max 5 extensions, max total extension 600 s.
//
// The function under test is real; `save` is a stubbed persistence
// boundary so the policy logic can be exercised without a database.
const liveCar = (overrides = {}) => ({
  _id: "car-1",
  auctionEnd: new Date(Date.now() + 60_000),
  extensionCount: 0,
  save: async () => {},
  ...overrides,
});

describe("applySnipingProtection — canonical anti-sniping", () => {
  it("extends the auction when a bid lands inside the snipe window", async () => {
    const car = liveCar();
    const before = car.auctionEnd.getTime();
    expect(await applySnipingProtection(car)).toBe(true);
    expect(car.auctionEnd.getTime()).toBe(before + 120_000);
    expect(car.extensionCount).toBe(1);
  });

  it("does not extend outside the snipe window", async () => {
    const car = liveCar({ auctionEnd: new Date(Date.now() + 300_000) });
    const before = car.auctionEnd.getTime();
    expect(await applySnipingProtection(car)).toBe(false);
    expect(car.auctionEnd.getTime()).toBe(before);
    expect(car.extensionCount).toBe(0);
  });

  it("does not extend once the extension cap is reached", async () => {
    const car = liveCar({ extensionCount: 5 });
    const before = car.auctionEnd.getTime();
    expect(await applySnipingProtection(car)).toBe(false);
    expect(car.auctionEnd.getTime()).toBe(before);
    expect(car.extensionCount).toBe(5);
  });

  it("does not extend an already-ended auction", async () => {
    const car = liveCar({ auctionEnd: new Date(Date.now() - 5_000) });
    const before = car.auctionEnd.getTime();
    expect(await applySnipingProtection(car)).toBe(false);
    expect(car.auctionEnd.getTime()).toBe(before);
  });

  it("does nothing when the auction has no end time", async () => {
    const car = liveCar({ auctionEnd: null });
    expect(await applySnipingProtection(car)).toBe(false);
  });
});
