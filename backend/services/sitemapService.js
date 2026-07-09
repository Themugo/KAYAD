import { findAll } from "../db/index.js";

const BASE_URL = "https://www.kayad.space";

export const generateVehicleSitemap = async () => {
  try {
    const cars = await findAll("cars", {
      filters: { status: "active" },
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
    const auctions = await findAll("auctions", {
      filters: { status: { $in: ["scheduled", "live"] } },
      select: "id,updatedAt",
    });

    const urls = auctions.map((auction) => ({
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
