import express from "express";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { logInfo, logError } from "../utils/logger.js";

const router = express.Router();

router.post("/inventory", async (req, res) => {
  try {
    const { apiKey, listings } = req.body;
    if (!apiKey || !Array.isArray(listings)) {
      return res.status(400).json({ success: false, message: "apiKey and listings array required" });
    }

    const dealer = await User.findOne({ apiKey }).select("_id role");
    if (!dealer || dealer.role !== "dealer") {
      return res.status(401).json({ success: false, message: "Invalid API key" });
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };
    for (const item of listings) {
      try {
        if (!item.title || !item.price) {
          results.skipped++;
          continue;
        }
        const existing = item.vin
          ? await Car.findOne({ vin: item.vin, dealer: dealer._id })
          : null;
        if (existing) {
          await Car.findByIdAndUpdate(existing._id, { $set: { ...item, dealer: dealer._id } });
          results.updated++;
        } else {
          await Car.create({ ...item, dealer: dealer._id });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ item: item.title || "unknown", error: err.message });
        results.skipped++;
      }
    }

    logInfo("Webhook inventory sync", { dealerId: dealer._id, results });
    res.json({ success: true, results });
  } catch (err) {
    logError("Webhook error", err);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

export default router;
