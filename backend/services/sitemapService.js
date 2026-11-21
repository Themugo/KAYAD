import { findAll } from "../db/index.js";
import { evaluateEligibilityBatch } from "./privateSellerAuctionEligibility.service.js";

const BASE_URL = "https://www.kayad.space";

export const generateVehicleSitemap = async () => {
  try {
    const cars = await findAll("cars", {
      // Phase C.1: soft-deleted vehicles keep status "available"; never advertise them.
      filters: { status: "available", deletedAt: { $exists: false } },
      select: "id,updatedAt",
    });

    const urls = cars.map((car) => ({
      loc: `${BASE_URL}/cars/${car.id}`,
      lastmod: car.updatedAt ? new Date(car.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.8,
    }));

    return generateXMLSitemap(urls);
  } catch (err) {
    console.error("Error generating vehicle sitemap:", err);
    return generateXMLSitemap([]);
  }
};

export const generateDealerSitemap = async () => {
  try {
    const dealers = await findAll("users", {
      filters: { role: "dealer", status: "approved" },
      select: "id,updatedAt",
    });

    const urls = dealers.map((dealer) => ({
      loc: `${BASE_URL}/dealer/${dealer.id}`,
      lastmod: dealer.updatedAt ? new Date(dealer.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.7,
    }));

    return generateXMLSitemap(urls);
  } catch (err) {
    console.error("Error generating dealer sitemap:", err);
    return generateXMLSitemap([]);
  }
};

export const generateAuctionSitemap = async () => {
  try {
    const auctions = await findAll("cars", {
      filters: { deletedAt: { $exists: false }, auctionStatus: { $in: ["live", "ended"] } },
      select: "id,updatedAt,auctionStatus",
    });

    // Stage 5F.10: never advertise a live auction that fails the PostgreSQL private-seller gate (fail-closed: on error, list only ended auctions).
    const liveRows = auctions.filter((a) => a.auctionStatus === "live");
    let verdicts = new Map();
    if (liveRows.length) { try { verdicts = await evaluateEligibilityBatch(liveRows.map((a) => a.id)); } catch { verdicts = new Map(); } }
    const visible = auctions.filter((a) => a.auctionStatus !== "live" || verdicts.get(String(a.id))?.eligible === true);

    const urls = visible.map((auction) => ({
      loc: `${BASE_URL}/auctions/${auction.id}`,
      lastmod: auction.updatedAt
        ? new Date(auction.updatedAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      changefreq: "hourly",
      priority: 0.9,
    }));

    return generateXMLSitemap(urls);
  } catch (err) {
    console.error("Error generating auction sitemap:", err);
    return generateXMLSitemap([]);
  }
};

export const generateSitemapIndex = async () => {
  const sitemaps = [
    { loc: `${BASE_URL}/sitemap-cars.xml`, lastmod: new Date().toISOString().split("T")[0] },
    { loc: `${BASE_URL}/sitemap-dealers.xml`, lastmod: new Date().toISOString().split("T")[0] },
    { loc: `${BASE_URL}/sitemap-auctions.xml`, lastmod: new Date().toISOString().split("T")[0] },
  ];
  return generateXMLSitemapIndex(sitemaps);
};

const generateXMLSitemap = (urls) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
};

const generateXMLSitemapIndex = (sitemaps) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((sitemap) => `  <sitemap>
    <loc>${sitemap.loc}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join("\n")}
</sitemapindex>`;
};
