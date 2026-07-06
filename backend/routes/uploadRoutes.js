import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { uploadMemory, handleUploadError } from "../middleware/upload.js";
import { uploadImage, uploadMultiple, deleteImage } from "../config/cloudinary.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { getUploadRecord } from "../services/sqlUploadStore.js";

const router = express.Router();

const FOLDERS = [
  "vehicles", "dealers", "profiles", "inspection",
  "auction", "escrow", "documents", "receipts",
  "marketing", "chat", "temp",
];

router.post(
  "/",
  protect,
  uploadLimiter,
  uploadMemory.single("file"),
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const folder = req.body.folder || "temp";
    if (!FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: `Invalid folder. Must be one of: ${FOLDERS.join(", ")}` });
    }

    const result = await uploadImage(req.file, `kayad/${folder}`, {
      generateVariants: folder !== "documents" && folder !== "receipts" && folder !== "temp",
      preserveOriginal: true,
    });

    res.json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      thumb: result.thumb || result.url,
      card: result.card || result.url,
    });
  }),
);

router.post(
  "/multiple",
  protect,
  uploadLimiter,
  uploadMemory.array("files", 20),
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const folder = req.body.folder || "temp";
    if (!FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: `Invalid folder. Must be one of: ${FOLDERS.join(", ")}` });
    }

    const results = await uploadMultiple(req.files, `kayad/${folder}`);

    res.json({
      success: true,
      files: results.map((r) => ({
        url: r.url,
        public_id: r.public_id,
        thumb: r.thumb || r.url,
        card: r.card || r.url,
      })),
    });
  }),
);

router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const record = getUploadRecord(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Upload not found" });
    }

    if (!record.content) {
      if (record.url) {
        return res.redirect(record.url);
      }
      return res.status(404).json({ success: false, message: "Upload content unavailable" });
    }

    res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(record.originalName || "upload")}"`);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(record.content);
  }),
);

router.delete(
  "/:publicId",
  protect,
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    if (!publicId) return res.status(400).json({ success: false, message: "No public_id provided" });
    await deleteImage(publicId);
    res.json({ success: true, message: "File deleted" });
  }),
);

export default router;
