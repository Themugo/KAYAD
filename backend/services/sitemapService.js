// backend/services/sitemapService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dynamic sitemap generation service
// Generates XML sitemaps for vehicles, dealers, and auctions
// ─────────────────────────────────────────────────────────────

import Car from "../models/Car.js";
import User from "../models/User.js";
import Auction from "../models/Auction.js";

const BASE_URL = "https://www.kayad.space";

// =============================
// 🚗 VEHICLE SITEMAP GENERATOR
// =============================
export const generateVehicleSitemap = async () => {
  try {
    const cars = await Car.find({ status: "active" })
      .select("_id updatedAt")
      .lean();

    const urls = cars.map((car) => ({
      loc: `${BASE_URL}/cars/${car._id}`,
      lastmod: car.updatedAt ? car.updatedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.8,
    }));

    return generateXMLSitemap(urls);
  } catch (err) {
    console.error("Error generating vehicle sitemap:", err);
    return generateXMLSitemap([]);
  }
};

// =============================
// 🏪 DEALER SITEMAP GENERATOR
// =============================
export const generateDealerSitemap = async () => {
  try {
    const dealers = await User.find({ role: "dealer", status: "approved" })
      .select("_id updatedAt")
      .lean();

    const urls = dealers.map((dealer) => ({
      loc: `${BASE_URL}/dealer/${dealer._id}`,
      lastmod: dealer.updatedAt ? dealer.updatedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.7,
    }));

    return generateXMLSitemap(urls);
  } catch (err) {
    console.error("Error generating dealer sitemap:", err);
    return generateXMLSitemap([]);
  }
};

// =============================
// 🎪 AUCTION SITEMAP GENERATOR
// =============================
export const generateAuctionSitemap = async () => {
  try {
    const auctions = await Auction.find({ status: { $in: ["scheduled", "live"] } })
      .select("_id updatedAt")
      .lean();

    const urls = auctions.map((auction) => ({
      loc: `${BASE_URL}/auctions/${auction._id}`,
      lastmod: auction.updatedAt ? auction.updatedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      changefreq: "hourly",
      priority: 0.9,
    }));

    return generateXMLSitemap(urls);
  } catch (err) {
    console.error("Error generating auction sitemap:", err);
    return generateXMLSitemap([]);
  }
};

// =============================
// 📋 SITEMAP INDEX GENERATOR
// =============================
export const generateSitemapIndex = async () => {
  const sitemaps = [
    {
      loc: `${BASE_URL}/sitemap-cars.xml`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    {
      loc: `${BASE_URL}/sitemap-dealers.xml`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    {
      loc: `${BASE_URL}/sitemap-auctions.xml`,
      lastmod: new Date().toISOString().split("T")[0],
    },
  ];

  return generateXMLSitemapIndex(sitemaps);
};

// =============================
// 📄 XML SITEMAP GENERATOR
// =============================
const generateXMLSitemap = (urls) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return xml;
};

// =============================
// 📄 XML SITEMAP INDEX GENERATOR
// =============================
const generateXMLSitemapIndex = (sitemaps) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((sitemap) => `  <sitemap>
    <loc>${sitemap.loc}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join("\n")}
</sitemapindex>`;

  return xml;
};
