import HeroSlide from "../models/HeroSlide.js";
import { logError } from "../infrastructure/logging/index.js";

// =============================
// 🖼️ GET VISIBLE HERO SLIDES (PUBLIC - what every real visitor sees)
// =============================
export const getHeroSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find({ isVisible: true }).sort({ sortOrder: 1 });
    res.json({ success: true, data: slides });
  } catch (error) {
    logError("Error fetching hero slides:", error);
    res.status(500).json({ success: false, message: "Failed to load hero" });
  }
};

// =============================
// 📋 GET ALL HERO SLIDES (ADMIN - including hidden ones, for the editor)
// =============================
export const getAllHeroSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find({}).sort({ sortOrder: 1 });
    res.json({ success: true, data: slides });
  } catch (error) {
    logError("Error fetching all hero slides:", error);
    res.status(500).json({ success: false, message: "Failed to load hero" });
  }
};

// =============================
// ➕ CREATE HERO SLIDE (ADMIN)
// =============================
export const createHeroSlide = async (req, res) => {
  try {
    const {
      eyebrowText, headline, subheadline,
      ctaPrimaryText, ctaPrimaryLink, ctaSecondaryText, ctaSecondaryLink,
      backgroundType, backgroundValue, overlayColor, overlayOpacity,
      displayMode, sortOrder,
    } = req.body;

    if (!headline || !headline.trim()) {
      return res.status(400).json({ success: false, message: "Headline is required" });
    }
    if (backgroundType && !["color", "gradient", "image"].includes(backgroundType)) {
      return res.status(400).json({ success: false, message: "Invalid background type" });
    }
    if (displayMode && !["boxed", "fullscreen"].includes(displayMode)) {
      return res.status(400).json({ success: false, message: "Invalid display mode" });
    }

    const slide = await HeroSlide.create({
      eyebrowText, headline: headline.trim(), subheadline,
      ctaPrimaryText, ctaPrimaryLink, ctaSecondaryText, ctaSecondaryLink,
      backgroundType, backgroundValue, overlayColor, overlayOpacity,
      displayMode, sortOrder,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    logError("Error creating hero slide:", error);
    res.status(500).json({ success: false, message: "Failed to create hero slide" });
  }
};

// =============================
// ✏️ UPDATE HERO SLIDE (ADMIN)
// =============================
export const updateHeroSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HeroSlide.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Hero slide not found" });
    }

    const allowedFields = [
      "eyebrowText", "headline", "subheadline",
      "ctaPrimaryText", "ctaPrimaryLink", "ctaSecondaryText", "ctaSecondaryLink",
      "backgroundType", "backgroundValue", "overlayColor", "overlayOpacity",
      "displayMode", "isVisible", "sortOrder",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.backgroundType && !["color", "gradient", "image"].includes(updates.backgroundType)) {
      return res.status(400).json({ success: false, message: "Invalid background type" });
    }
    if (updates.displayMode && !["boxed", "fullscreen"].includes(updates.displayMode)) {
      return res.status(400).json({ success: false, message: "Invalid display mode" });
    }

    const updated = await HeroSlide.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    logError("Error updating hero slide:", error);
    res.status(500).json({ success: false, message: "Failed to update hero slide" });
  }
};

// =============================
// 🗑️ DELETE HERO SLIDE (ADMIN)
// =============================
export const deleteHeroSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HeroSlide.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Hero slide not found" });
    }
    await HeroSlide.findByIdAndDelete(id);
    res.json({ success: true, message: "Hero slide removed" });
  } catch (error) {
    logError("Error deleting hero slide:", error);
    res.status(500).json({ success: false, message: "Failed to remove hero slide" });
  }
};
