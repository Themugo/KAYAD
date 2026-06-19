// backend/services/imageMigrationService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Image migration service
// Batch processes existing images to generate variants and optimize storage
// ─────────────────────────────────────────────────────────────

import Car from "../models/Car.ts";
import { uploadImage } from "../config/cloudinary.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 📊 MIGRATION STATUS
// =============================

let migrationStatus = {
  total: 0,
  processed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
  errors: [],
};

// =============================
// 🔍 GET ALL IMAGES TO MIGRATE
// =============================

const getImagesToMigrate = async () => {
  try {
    const cars = await Car.find({
      images: { $exists: true, $ne: [] },
    })
      .select("_id images")
      .lean();

    const images = [];
    for (const car of cars) {
      for (const image of car.images) {
        // Only migrate images that don't have variants
        if (typeof image === "string" || !image.mobile || !image.tablet) {
          images.push({
            carId: car._id,
            image: image,
          });
        }
      }
    }

    return images;
  } catch (err) {
    logError("Failed to get images to migrate", err);
    throw err;
  }
};

// =============================
// 🔄 MIGRATE SINGLE IMAGE
// =============================

const migrateSingleImage = async (carId, image) => {
  try {
    // Skip if image is already a Cloudinary URL with variants
    if (typeof image === "object" && image.mobile && image.tablet) {
      return { skipped: true, reason: "Already has variants" };
    }

    // Skip if image is not a Cloudinary URL
    if (typeof image === "string" && !image.includes("cloudinary.com")) {
      return { skipped: true, reason: "Not a Cloudinary URL" };
    }

    // Extract public_id from Cloudinary URL
    const publicId = typeof image === "string" ? image.split("/").pop().split(".")[0] : image.public_id;

    if (!publicId) {
      return { skipped: true, reason: "Could not extract public_id" };
    }

    // Regenerate with variants
    const result = await uploadImage(
      { buffer: null, path: typeof image === "string" ? image : image.url },
      "kayad/cars",
      { generateVariants: true, preserveOriginal: true },
    );

    // Update car document
    await Car.findByIdAndUpdate(carId, {
      $set: {
        "images.$[elem]": result,
      },
    });

    return { success: true, result };
  } catch (err) {
    logError("Failed to migrate image", err, { carId, image });
    return { failed: true, error: err.message };
  }
};

// =============================
// 🚀 RUN MIGRATION
// =============================

export const runMigration = async (options = {}) => {
  const { batchSize = 10, limit = null, dryRun = false } = options;

  try {
    migrationStatus = {
      total: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
      endTime: null,
      errors: [],
    };

    logInfo("Starting image migration", { batchSize, limit, dryRun });

    const images = await getImagesToMigrate();
    migrationStatus.total = images.length;

    if (limit) {
      images.length = Math.min(images.length, limit);
    }

    logInfo("Images to migrate", { count: images.length });

    // Process in batches
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      for (const { carId, image } of batch) {
        if (dryRun) {
          migrationStatus.skipped++;
          continue;
        }

        const result = await migrateSingleImage(carId, image);

        if (result.success) {
          migrationStatus.processed++;
        } else if (result.failed) {
          migrationStatus.failed++;
          migrationStatus.errors.push({
            carId,
            error: result.error,
          });
        } else if (result.skipped) {
          migrationStatus.skipped++;
        }
      }

      logInfo("Migration progress", {
        processed: migrationStatus.processed,
        failed: migrationStatus.failed,
        skipped: migrationStatus.skipped,
        total: migrationStatus.total,
      });
    }

    migrationStatus.endTime = new Date();

    logInfo("Migration completed", migrationStatus);

    return migrationStatus;
  } catch (err) {
    logError("Migration failed", err);
    throw err;
  }
};

// =============================
// 📊 GET MIGRATION STATUS
// =============================

export const getMigrationStatus = () => {
  return migrationStatus;
};

// =============================
// 🔄 RESET MIGRATION STATUS
// =============================

export const resetMigrationStatus = () => {
  migrationStatus = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    startTime: null,
    endTime: null,
    errors: [],
  };
};

export default {
  runMigration,
  getMigrationStatus,
  resetMigrationStatus,
};
