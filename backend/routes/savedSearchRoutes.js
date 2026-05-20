import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import SavedSearch from "../models/SavedSearch.js";

const router = express.Router();
router.use(protect);

router.get("/", asyncHandler(async (req, res) => {
  const searches = await SavedSearch.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, searches });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, filters, notify } = req.body;
  if (!name || !filters) {
    return res.status(400).json({ success: false, message: "name and filters required" });
  }
  const search = await SavedSearch.create({
    user: req.user.id,
    name,
    filters,
    notify: notify !== false,
  });
  res.json({ success: true, search });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const { name, filters, notify } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (filters !== undefined) update.filters = filters;
  if (notify !== undefined) update.notify = notify;

  const search = await SavedSearch.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: update },
    { new: true }
  );
  if (!search) return res.status(404).json({ success: false, message: "Saved search not found" });
  res.json({ success: true, search });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const search = await SavedSearch.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!search) return res.status(404).json({ success: false, message: "Saved search not found" });
  res.json({ success: true, message: "Deleted" });
}));

export default router;
