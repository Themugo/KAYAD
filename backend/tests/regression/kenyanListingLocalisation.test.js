// Kenyan listing vocabulary, comma-formatted figures, and onboarding without paperwork or banking.
import { describe, test, expect } from "@jest/globals";
import { createCarSchema, updateCarSchema } from "../../validation/car.schema.js";
import { dealerOnboardingSchema } from "../../validation/dealerOnboarding.schema.js";
import { FUEL_TYPES, CONDITIONS, normalizeFuel, isPetrolFuel, stripNumberFormatting } from "../../utils/vehicleOptions.js";
import { DEFAULT_ITEMS } from "../../services/dealerPaperwork.service.js";

const base = { title: "Toyota Land Cruiser V8", brand: "Toyota", model: "Land Cruiser", year: 2018, price: 1000000 };

describe("vocabulary", () => {
  test("Kenyan conditions and Petrol (not Gasoline)", () => {
    expect([...CONDITIONS]).toEqual(["Ex-Japan", "Locally Used", "New Import", "Locally Assembled"]);
    expect(FUEL_TYPES).toContain("Petrol");
    expect(FUEL_TYPES).not.toContain("Gasoline");
  });
  test.each(["Gasoline", "gasoline", " GAS ", "petrol", "PETROL"])("%j is stored as Petrol", (v) => {
    expect(normalizeFuel(v)).toBe("Petrol");
    expect(isPetrolFuel(v)).toBe(true);
  });
  test("other fuels are untouched", () => {
    expect(normalizeFuel("Diesel")).toBe("Diesel");
    expect(isPetrolFuel("Diesel")).toBe(false);
  });
  test("create and edit both store the legacy 'Gasoline' as 'Petrol'", () => {
    expect(createCarSchema.parse({ ...base, fuel: "Gasoline" }).fuel).toBe("Petrol");
    expect(updateCarSchema.parse({ fuel: "Gasoline" }).fuel).toBe("Petrol");
  });
  test("condition values are accepted as sent", () => {
    for (const c of CONDITIONS) expect(createCarSchema.parse({ ...base, condition: c }).condition).toBe(c);
  });
});

describe("figures typed with commas", () => {
  test("price and mileage: '1,850,000' / '120,500' / '1 850 000'", () => {
    const r = createCarSchema.parse({ ...base, price: "1,850,000", mileage: "120,500" });
    expect(r.price).toBe(1850000);
    expect(r.mileage).toBe(120500);
    expect(createCarSchema.parse({ ...base, price: "1 850 000" }).price).toBe(1850000);
    expect(updateCarSchema.parse({ price: "2,000,000" }).price).toBe(2000000);
  });
  test("plain numbers still work", () => {
    expect(createCarSchema.parse({ ...base, price: 950000, mileage: "45000" })).toMatchObject({ price: 950000, mileage: 45000 });
  });
  test("nothing is guessed: junk, zero and over-limit prices are still rejected", () => {
    expect(createCarSchema.safeParse({ ...base, price: "abc" }).success).toBe(false);
    expect(createCarSchema.safeParse({ ...base, price: "1,2x" }).success).toBe(false);
    expect(createCarSchema.safeParse({ ...base, price: "0" }).success).toBe(false);
    expect(createCarSchema.safeParse({ ...base, price: "100,000,001" }).success).toBe(false);
    expect(createCarSchema.safeParse({ ...base, mileage: "-5" }).success).toBe(false);
  });
  test("blank stays 'not provided'", () => {
    // Mileage is optional, so blank stays "not provided". Price is now required (a blank price used to reach the DB NOT NULL and 500).
    expect(createCarSchema.parse({ ...base, mileage: "" }).mileage).toBeUndefined();
    expect(createCarSchema.safeParse({ ...base, price: "" }).success).toBe(false);
  });
  test("stripNumberFormatting leaves non-strings alone", () => {
    expect(stripNumberFormatting(5)).toBe(5);
    expect(stripNumberFormatting(null)).toBe(null);
  });
});

describe("onboarding: no banking, no paperwork by default", () => {
  test("business name and location are all that is required", () => {
    expect(dealerOnboardingSchema.safeParse({ businessName: "Makena Dealers", location: "Nairobi" }).success).toBe(true);
  });
  test("an empty business name or location is still refused", () => {
    expect(dealerOnboardingSchema.safeParse({ businessName: "", location: "Nairobi" }).success).toBe(false);
    expect(dealerOnboardingSchema.safeParse({ businessName: "Makena", location: " " }).success).toBe(false);
  });
  test("banking, if a caller does send it, is still validated (partial bank details are refused)", () => {
    const ok = dealerOnboardingSchema.safeParse({ businessName: "Makena", location: "Nairobi", paymentDetails: { mpesaPhone: "0712345678" } });
    expect(ok.success).toBe(true);
    const bad = dealerOnboardingSchema.safeParse({ businessName: "Makena", location: "Nairobi", paymentDetails: { bankName: "KCB" } });
    expect(bad.success).toBe(false);
  });
  test("paperwork is off by default for every item", () => {
    expect(Object.values(DEFAULT_ITEMS).every((i) => i.enabled === false && i.required === false)).toBe(true);
  });
});
