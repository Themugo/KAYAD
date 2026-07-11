import { describe, it, expect } from "@jest/globals";
import { createCarSchema, updateCarSchema } from "../../validation/car.schema.js";

describe("createCarSchema", () => {
  it("validates correct car data", () => {
    const validData = {
      title: "Toyota Land Cruiser V8 2021",
      brand: "Toyota",
      model: "Land Cruiser V8",
      year: 2021,
      price: 8500000,
      fuel: "Diesel",
      transmission: "Automatic",
      mileage: 45000,
      bodyType: "SUV",
      color: "Black",
      condition: "Excellent",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates minimal required data", () => {
    const validData = {
      title: "My Car",
      brand: "Toyota",
      price: 100000,
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates string year conversion", () => {
    const validData = {
      title: "My Car",
      brand: "Toyota",
      price: 100000,
      year: "2021",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2021);
    }
  });

  it("rejects title too short", () => {
    const invalidData = {
      title: "A",
      brand: "Toyota",
      price: 100000,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects missing brand", () => {
    const invalidData = {
      title: "My Car",
      price: 100000,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const invalidData = {
      title: "My Car",
      brand: "Toyota",
      price: -1000,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects price exceeding maximum", () => {
    const invalidData = {
      title: "Expensive Car",
      brand: "Toyota",
      price: 200_000_001,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts price at maximum", () => {
    const validData = {
      title: "Expensive Car",
      brand: "Toyota",
      price: 100_000_000,
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects year before 1900", () => {
    const invalidData = {
      title: "Old Car",
      brand: "Toyota",
      price: 100000,
      year: 1800,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects year after 2030", () => {
    const invalidData = {
      title: "Future Car",
      brand: "Toyota",
      price: 100000,
      year: 2031,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts year 2030", () => {
    const validData = {
      title: "Future Car",
      brand: "Toyota",
      price: 100000,
      year: 2030,
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects negative mileage", () => {
    const invalidData = {
      title: "Car",
      brand: "Toyota",
      price: 100000,
      mileage: -1000,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts zero mileage", () => {
    const validData = {
      title: "New Car",
      brand: "Toyota",
      price: 100000,
      mileage: 0,
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts boolean fields as strings", () => {
    const validData = {
      title: "My Car",
      brand: "Toyota",
      price: 100000,
      allowBuy: "true",
      allowBid: "false",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowBuy).toBe(true);
      expect(result.data.allowBid).toBe(false);
    }
  });

  it("accepts features as array", () => {
    const validData = {
      title: "My Car",
      brand: "Toyota",
      price: 100000,
      features: ["Leather seats", "Sunroof", "GPS"],
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts features as single string", () => {
    const validData = {
      title: "My Car",
      brand: "Toyota",
      price: 100000,
      features: "Leather seats",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.features)).toBe(true);
    }
  });

  it("rejects features exceeding max count", () => {
    const features = Array(51).fill("Feature");
    const invalidData = {
      title: "Car",
      brand: "Toyota",
      price: 100000,
      features,
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts valid VIN format", () => {
    const validData = {
      title: "Car",
      brand: "Toyota",
      price: 100000,
      vin: "1HGBH41JXMN109186",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects VIN too long", () => {
    const invalidData = {
      title: "Car",
      brand: "Toyota",
      price: 100000,
      vin: "A".repeat(51),
    };
    const result = createCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts optional auction settings", () => {
    const validData = {
      title: "Auction Car",
      brand: "Toyota",
      price: 100000,
      auctionStatus: "live",
      auctionEnd: "2024-12-31T23:59:59Z",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts valid coverImage index", () => {
    const validData = {
      title: "Car",
      brand: "Toyota",
      price: 100000,
      coverImage: "0",
    };
    const result = createCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coverImage).toBe(0);
    }
  });
});

describe("updateCarSchema", () => {
  it("allows partial update with single field", () => {
    const validData = {
      price: 200000,
    };
    const result = updateCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("allows empty update", () => {
    const validData = {};
    const result = updateCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates same rules as create for provided fields", () => {
    const invalidData = {
      price: -1000,
    };
    const result = updateCarSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("allows updating multiple fields", () => {
    const validData = {
      title: "Updated Title",
      price: 150000,
      mileage: 50000,
      color: "Red",
    };
    const result = updateCarSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
