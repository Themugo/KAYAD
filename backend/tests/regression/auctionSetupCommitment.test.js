import { describe, it, expect } from "@jest/globals";
import { normalizeAuctionSetup, validateConfig } from "../../services/auctionSetup.contract.js";

describe("auction setup commitment contract", () => {
  const base = () => normalizeAuctionSetup({
    commitment: { required: true, type: "fixed", amount: 5000, recipient: "organizer" },
  });
  const destErrors = (cfg) => validateConfig(cfg).filter((e) => /destination/i.test(e));

  it("no longer demands a typed payment destination (collection account is verified in Banking, else KAYAD-held)", () => {
    expect(destErrors(base())).toEqual([]);
  });
  it("still still requires an amount", () => {
    const cfg = normalizeAuctionSetup({ commitment: { required: true, type: "fixed", amount: 0, recipient: "" } });
    const errs = validateConfig(cfg);
    expect(errs).toContain("Commitment amount is required");
  });
});
