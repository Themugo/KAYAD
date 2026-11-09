import { describe, expect, test } from "@jest/globals";
import { ipInCidr } from "../../middleware/mpesaSecurity.js";

describe("M-Pesa callback CIDR allowlist parsing", () => {
  test("matches addresses inside a valid IPv4 CIDR", () => {
    expect(ipInCidr("196.201.214.205", "196.201.214.0/24")).toBe(true);
  });

  test("rejects addresses outside a valid IPv4 CIDR", () => {
    expect(ipInCidr("203.0.113.10", "196.201.214.0/24")).toBe(false);
  });

  test("supports exact-host IPv4 CIDRs", () => {
    expect(ipInCidr("196.201.214.200", "196.201.214.200/32")).toBe(true);
    expect(ipInCidr("196.201.214.201", "196.201.214.200/32")).toBe(false);
  });

  test("fails closed on malformed CIDR prefixes instead of widening the allowlist", () => {
    expect(ipInCidr("203.0.113.10", "196.201.214.0/not-a-number")).toBe(false);
    expect(ipInCidr("203.0.113.10", "196.201.214.0/33")).toBe(false);
    expect(ipInCidr("203.0.113.10", "")).toBe(false);
  });

  test("supports valid IPv6 CIDR ranges", () => {
    expect(ipInCidr("2001:db8::10", "2001:db8::/32")).toBe(true);
    expect(ipInCidr("2001:dead::10", "2001:db8::/32")).toBe(false);
  });
});
