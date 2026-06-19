// backend/routes/seoRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SEO routes for dynamic sitemap generation
// Provides XML sitemaps for vehicles, dealers, and auctions
// ─────────────────────────────────────────────────────────────

import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import {
  getVehicleSitemap,
  getDealerSitemap,
  getAuctionSitemap,
  getSitemapIndex,
} from "../controllers/seoController.ts";

const router = express.Router();

// =============================
// 📋 SITEMAP ENDPOINTS
// =============================

// GET /sitemap.xml - Sitemap index
router.get("/sitemap.xml", asyncHandler(getSitemapIndex));

// GET /sitemap-cars.xml - Vehicle sitemap
router.get("/sitemap-cars.xml", asyncHandler(getVehicleSitemap));

// GET /sitemap-dealers.xml - Dealer sitemap
router.get("/sitemap-dealers.xml", asyncHandler(getDealerSitemap));

// GET /sitemap-auctions.xml - Auction sitemap
router.get("/sitemap-auctions.xml", asyncHandler(getAuctionSitemap));

export default router;
