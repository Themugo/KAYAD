import AdSlot from "../models/AdSlot.js";
import { logError } from "../infrastructure/logging/index.js";

const VALID_PLACEMENTS = ["top_ticker", "left_rail", "right_rail", "mid_grid", "sidebar"];

// =============================
// 📢 GET VISIBLE AD SLOTS (PUBLIC - what every real visitor sees)
// =============================
export const getAdSlots = async (req, res) => {
  try {
    const { placement } = req.query;
    const filter = { isVisible: true };
    if (placement) {
      if (!VALID_PLACEMENTS.includes(placement)) {
        return res.status(400).json({ success: false, message: "Invalid placement" });
      }
      filter.placement = placement;
    }
    const slots = await AdSlot.find(filter).sort({ sortOrder: 1 });
    res.json({ success: true, data: slots });
  } catch (error) {
    logError("Error fetching ad slots:", error);
    res.status(500).json({ success: false, message: "Failed to load ads" });
  }
};

// =============================
// 📋 GET ALL AD SLOTS (ADMIN - including hidden ones, for the manager UI)
// =============================
export const getAllAdSlots = async (req, res) => {
  try {
    const slots = await AdSlot.find({}).sort({ placement: 1, sortOrder: 1 });
    res.json({ success: true, data: slots });
  } catch (error) {
    logError("Error fetching all ad slots:", error);
    res.status(500).json({ success: false, message: "Failed to load ads" });
  }
};

// =============================
// ➕ CREATE AD SLOT (ADMIN)
// =============================
export const createAdSlot = async (req, res) => {
  try {
    const { placement, title, tagline, priceTag, buttonText, buttonUrl, backgroundColor, textColor, opacity, sortOrder } = req.body;

    if (!placement || !VALID_PLACEMENTS.includes(placement)) {
      return res.status(400).json({ success: false, message: "A valid placement is required" });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const slot = await AdSlot.create({
      placement,
      title: title.trim(),
      tagline,
      priceTag,
      buttonText,
      buttonUrl,
      backgroundColor,
      textColor,
      opacity,
      sortOrder,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    logError("Error creating ad slot:", error);
    res.status(500).json({ success: false, message: "Failed to create ad" });
  }
};

// =============================
// ✏️ UPDATE AD SLOT (ADMIN)
// =============================
export const updateAdSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await AdSlot.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Ad slot not found" });
    }

    const allowedFields = [
      "placement", "title", "tagline", "priceTag", "buttonText", "buttonUrl",
      "backgroundColor", "textColor", "opacity", "isVisible", "sortOrder",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.placement && !VALID_PLACEMENTS.includes(updates.placement)) {
      return res.status(400).json({ success: false, message: "Invalid placement" });
    }

    const updated = await AdSlot.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    logError("Error updating ad slot:", error);
    res.status(500).json({ success: false, message: "Failed to update ad" });
  }
};

// =============================
// 🗑️ DELETE AD SLOT (ADMIN)
// =============================
export const deleteAdSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await AdSlot.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Ad slot not found" });
    }
    await AdSlot.findByIdAndDelete(id);
    res.json({ success: true, message: "Ad slot removed" });
  } catch (error) {
    logError("Error deleting ad slot:", error);
    res.status(500).json({ success: false, message: "Failed to remove ad" });
  }
};
