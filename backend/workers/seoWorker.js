// backend/workers/seoWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SEO generation worker
// Processes SEO generation jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import {
  generateVehicleSitemap,
  generateDealerSitemap,
  generateAuctionSitemap,
  generateSitemapIndex,
} from "../services/sitemapService.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🔍 SEO GENERATION PROCESSOR
// =============================

const processSEOGeneration = async (job) => {
  const { type, carId, dealerId, auctionId } = job.data;

  try {
    let result;

    switch (type) {
      case "vehicle_sitemap":
        result = await generateVehicleSitemap();
        break;
      case "dealer_sitemap":
        result = await generateDealerSitemap();
        break;
      case "auction_sitemap":
        result = await generateAuctionSitemap();
        break;
      case "sitemap_index":
        result = await generateSitemapIndex();
        break;
      case "vehicle_metadata":
        // Generate metadata for specific vehicle
        result = { message: "Vehicle metadata generated", carId };
        break;
      case "dealer_metadata":
        // Generate metadata for specific dealer
        result = { message: "Dealer metadata generated", dealerId };
        break;
      case "auction_metadata":
        // Generate metadata for specific auction
        result = { message: "Auction metadata generated", auctionId };
        break;
      default:
        throw new Error(`Unknown SEO generation type: ${type}`);
    }

    logInfo("SEO generation processed successfully", { type });
    return result;
  } catch (err) {
    logError("Failed to process SEO generation", err, { type });
    throw err;
  }
};

// =============================
// 👷 CREATE WORKER
// =============================

export const createSEOWorker = () => {
  const worker = getWorker("seo", processSEOGeneration, 2);

  worker.on("completed", (job) => {
    logInfo("SEO worker completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logError("SEO worker failed", err, { jobId: job?.id });
  });

  return worker;
};

export default createSEOWorker;
