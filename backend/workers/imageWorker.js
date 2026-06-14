// backend/workers/imageWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Image processing worker
// Processes image processing jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { v2 as cloudinary } from "cloudinary";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🖼️ IMAGE PROCESSING PROCESSOR
// =============================

const processImage = async (job) => {
  const { imageId, imageUrl, operations = [] } = job.data;

  try {
    let result = { originalUrl: imageUrl, processedUrls: [] };

    for (const operation of operations) {
      switch (operation.type) {
        case "resize":
          const resized = await cloudinary.url(imageUrl, {
            width: operation.width,
            height: operation.height,
            crop: operation.crop || "fill",
          });
          result.processedUrls.push({ type: "resize", url: resized });
          break;

        case "thumbnail":
          const thumbnail = await cloudinary.url(imageUrl, {
            width: operation.width || 200,
            height: operation.height || 200,
            crop: operation.crop || "fill",
            quality: operation.quality || "auto",
          });
          result.processedUrls.push({ type: "thumbnail", url: thumbnail });
          break;

        case "optimize":
          const optimized = await cloudinary.url(imageUrl, {
            quality: operation.quality || "auto",
            fetch_format: operation.format || "auto",
          });
          result.processedUrls.push({ type: "optimize", url: optimized });
          break;

        case "watermark":
          const watermarked = await cloudinary.url(imageUrl, {
            overlay: operation.overlay,
            gravity: operation.gravity || "south_east",
            opacity: operation.opacity || 0.5,
          });
          result.processedUrls.push({ type: "watermark", url: watermarked });
          break;

        default:
          logWarn("Unknown image operation", { type: operation.type });
      }
    }

    logInfo("Image processed successfully", { imageId, operationsCount: operations.length });
    return result;
  } catch (err) {
    logError("Failed to process image", err, { imageId });
    throw err;
  }
};

// =============================
// 👷 CREATE WORKER
// =============================

export const createImageWorker = () => {
  const worker = getWorker("image", processImage, 5);

  worker.on("completed", (job) => {
    logInfo("Image worker completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logError("Image worker failed", err, { jobId: job?.id });
  });

  return worker;
};

export default createImageWorker;
