// src/__tests__/seo.test.js
// ─────────────────────────────────────────────────────────────
// SEO system tests
// Tests metadata generation, OpenGraph tags, Twitter cards, and structured data
// ─────────────────────────────────────────────────────────────

import { generateVehicleMetadata, generateDealerMetadata, generateAuctionMetadata, getDefaultMetadata, generateCanonicalUrl } from "../utils/seoService";

describe("SEO Service", () => {
  describe("Default Metadata", () => {
    it("should generate default metadata", () => {
      const metadata = getDefaultMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.title).toBe("Kayad – Kenya's Premium Car Marketplace");
      expect(metadata.url).toBe("https://www.kayad.space");
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();
      expect(metadata.structuredData).toBeDefined();
    });
  });

  describe("Vehicle Metadata", () => {
    it("should generate vehicle metadata", () => {
      const car = {
        _id: "123",
        title: "Toyota Corolla 2020",
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        price: 1000000,
        description: "Well maintained Toyota Corolla",
        images: [{ url: "https://example.com/image.jpg" }],
        location: { city: "Nairobi" },
        transmission: "Automatic",
        fuel: "Petrol",
        mileage: 50000,
        bodyType: "Sedan",
        color: "White",
        drivetrain: "FWD",
        condition: "used",
        status: "active",
        dealer: {
          role: "dealer",
          businessName: "Test Dealer",
          phone: "+254712345678",
          email: "dealer@test.com",
        },
      };

      const metadata = generateVehicleMetadata(car);

      expect(metadata).toBeDefined();
      expect(metadata.title).toContain("Toyota Corolla 2020");
      expect(metadata.description).toContain("Toyota Corolla");
      expect(metadata.url).toBe("https://www.kayad.space/cars/123");
      expect(metadata.openGraph.type).toBe("product");
      expect(metadata.openGraph.priceAmount).toBe(1000000);
      expect(metadata.openGraph.priceCurrency).toBe("KES");
      expect(metadata.structuredData["@type"]).toBe("Vehicle");
      expect(metadata.structuredData.brand.name).toBe("Toyota");
      expect(metadata.structuredData.model).toBe("Corolla");
    });

    it("should handle missing car data", () => {
      const metadata = generateVehicleMetadata(null);
      expect(metadata).toEqual(getDefaultMetadata());
    });
  });

  describe("Dealer Metadata", () => {
    it("should generate dealer metadata", () => {
      const dealer = {
        _id: "456",
        businessName: "Premium Motors",
        name: "Premium Motors",
        description: "Leading car dealership in Kenya",
        logo: "https://example.com/logo.jpg",
        phone: "+254712345678",
        email: "info@premiummotors.com",
        role: "dealer",
        location: {
          city: "Nairobi",
          region: "Nairobi",
          coordinates: [36.8219, -1.2921],
        },
        listingsCount: 50,
      };

      const metadata = generateDealerMetadata(dealer);

      expect(metadata).toBeDefined();
      expect(metadata.title).toContain("Premium Motors");
      expect(metadata.description).toContain("Premium Motors");
      expect(metadata.url).toBe("https://www.kayad.space/dealer/456");
      expect(metadata.structuredData["@type"]).toBe("AutoDealer");
      expect(metadata.structuredData.name).toBe("Premium Motors");
    });

    it("should handle missing dealer data", () => {
      const metadata = generateDealerMetadata(null);
      expect(metadata).toEqual(getDefaultMetadata());
    });
  });

  describe("Auction Metadata", () => {
    it("should generate auction metadata", () => {
      const auction = {
        _id: "789",
        car: {
          _id: "123",
          title: "Toyota Corolla 2020",
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          description: "Live auction for Toyota Corolla",
          images: [{ url: "https://example.com/image.jpg" }],
        },
        startTime: new Date("2024-06-15T10:00:00Z"),
        endTime: new Date("2024-06-15T12:00:00Z"),
        status: "live",
        currentBid: 1000000,
        startingBid: 800000,
      };

      const metadata = generateAuctionMetadata(auction);

      expect(metadata).toBeDefined();
      expect(metadata.title).toContain("Live Auction");
      expect(metadata.description).toContain("Live auction");
      expect(metadata.url).toBe("https://www.kayad.space/auctions/789");
      expect(metadata.structuredData["@type"]).toBe("Event");
      expect(metadata.structuredData.eventStatus).toBe("https://schema.org/EventScheduled");
    });

    it("should handle missing auction data", () => {
      const metadata = generateAuctionMetadata(null);
      expect(metadata).toEqual(getDefaultMetadata());
    });
  });

  describe("Canonical URL", () => {
    it("should generate canonical URL", () => {
      const url = generateCanonicalUrl("/cars/123");
      expect(url).toBe("https://www.kayad.space/cars/123");
    });

    it("should handle root path", () => {
      const url = generateCanonicalUrl("/");
      expect(url).toBe("https://www.kayad.space/");
    });
  });
});
