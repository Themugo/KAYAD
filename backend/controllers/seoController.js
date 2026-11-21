// backend/controllers/seoController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SEO controller for dynamic sitemap generation
// Provides XML sitemaps for vehicles, dealers, and auctions
// ─────────────────────────────────────────────────────────────

import {
  generateVehicleSitemap,
  generateDealerSitemap,
  generateAuctionSitemap,
  generateSitemapIndex,
} from "../services/sitemapService.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🚗 GET VEHICLE SITEMAP
// =============================
export const getVehicleSitemap = async (req, res) => {
  try {
    const sitemap = await generateVehicleSitemap();

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.send(sitemap);

    logInfo("Vehicle sitemap generated");
  } catch (err) {
    logError("Error generating vehicle sitemap", err);
    res.status(500).send("Error generating sitemap");
  }
};

// =============================
// 🏪 GET DEALER SITEMAP
// =============================
export const getDealerSitemap = async (req, res) => {
  try {
    const sitemap = await generateDealerSitemap();

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.send(sitemap);

    logInfo("Dealer sitemap generated");
  } catch (err) {
    logError("Error generating dealer sitemap", err);
    res.status(500).send("Error generating sitemap");
  }
};

// =============================
// 🎪 GET AUCTION SITEMAP
// =============================
export const getAuctionSitemap = async (req, res) => {
  try {
    const sitemap = await generateAuctionSitemap();

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=1800"); // Cache for 30 minutes (auctions change frequently)
    res.send(sitemap);

    logInfo("Auction sitemap generated");
  } catch (err) {
    logError("Error generating auction sitemap", err);
    res.status(500).send("Error generating sitemap");
  }
};

// =============================
// 📋 GET SITEMAP INDEX
// =============================
export const getSitemapIndex = async (req, res) => {
  try {
    const sitemapIndex = await generateSitemapIndex();

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=600"); // Cache for 10 minutes
    res.send(sitemapIndex);

    logInfo("Sitemap index generated");
  } catch (err) {
    logError("Error generating sitemap index", err);
    res.status(500).send("Error generating sitemap");
  }
};
