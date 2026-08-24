import { getMinIncrement, getMinNextBid } from "../../utils/bidRules.js";

describe("bidRules — canonical minimum-increment tiers", () => {
  test.each([
    [0, 1000],
    [99_999, 1000],
    [100_000, 5000],
    [499_999, 5000],
    [500_000, 10_000],
    [1_999_999, 10_000],
    [2_000_000, 25_000],
    [10_000_000, 25_000],
  ])("currentBid %i → min increment %i", (currentBid, expected) => {
    expect(getMinIncrement(currentBid)).toBe(expected);
  });

  it("getMinNextBid adds the tier increment to the current bid", () => {
    expect(getMinNextBid(0)).toBe(1000);
    expect(getMinNextBid(250_000)).toBe(255_000);
    expect(getMinNextBid(5_000_000)).toBe(5_025_000);
  });

  it("treats non-numeric input as zero rather than NaN", () => {
    expect(getMinIncrement(undefined)).toBe(1000);
    expect(getMinNextBid(null)).toBe(1000);
  });
});
