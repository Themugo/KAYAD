import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { uploadMemory, handleUploadError } from "../middleware/upload.js";
import { uploadImage, uploadMultiple, deleteImage } from "../config/cloudinary.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { getUploadRecord, getUploadRecordByPublicId } from "../services/sqlUploadStore.js";
import { bareFolder, hasImageSignature, parseMetadata, CHAT_UPLOAD_FOLDER } from "../services/chatAttachments.js";

const router = express.Router();

// Folders whose assets are never publicly deliverable. `chat` holds private conversation files: they are stored as
// Cloudinary `authenticated` assets and are only reachable through GET /api/chat/:chatId/attachments/:uploadId.
// Public marketplace media (vehicles, dealers, profiles, auction, marketing, temp) keeps its existing public delivery.
export const PRIVATE_FOLDERS = ["documents", "receipts", "inspection", "escrow", CHAT_UPLOAD_FOLDER];

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

    const isPrivate = PRIVATE_FOLDERS.includes(folder);
    if (folder === CHAT_UPLOAD_FOLDER && !hasImageSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ success: false, code: "UPLOAD_CONTENT_MISMATCH", message: "File content does not match its declared type" });
    }
    const result = await uploadImage(req.file, `kayad/${folder}`, {
      generateVariants: folder !== "documents" && folder !== "receipts" && folder !== "temp",
      preserveOriginal: true,
      userId: String(req.user._id || req.user.id),
      visibility: isPrivate ? "private" : "public",
    });

    if (folder === CHAT_UPLOAD_FOLDER) {
      // No CDN URL (not even a signed one, which would be a permanent bearer link) leaves the server for chat files.
      return res.json({ success: true, uploadId: result.storageId, storageId: result.storageId, type: "image", private: true });
    }

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

    if (folder === CHAT_UPLOAD_FOLDER) {
      return res.status(400).json({ success: false, message: "Chat files are uploaded one at a time via POST /api/upload" });
    }
    const isPrivate = PRIVATE_FOLDERS.includes(folder);
    const results = await uploadMultiple(req.files, `kayad/${folder}`, {
      userId: String(req.user._id || req.user.id),
      visibility: isPrivate ? "private" : "public",
    });

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

    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    // record.folder is stored as "kayad/<folder>"; compare the bare folder name (the old comparison never matched).
    const isPrivate = PRIVATE_FOLDERS.includes(bareFolder(record.folder)) || parseMetadata(record).visibility === "private";
    const requesterId = String(req.user._id || req.user.id);
    if (isPrivate && !isAdmin && String(record.userId || "") !== requesterId) {
      return res.status(403).json({ success: false, code: "UPLOAD_FORBIDDEN", message: "You are not authorized to access this upload" });
    }

    if (!record.content) {
      if (record.url && !isPrivate) {
        return res.redirect(record.url);
      }
      return res.status(404).json({ success: false, message: "Upload content unavailable" });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(record.originalName || "upload")}"`);
    res.setHeader(
      "Cache-Control",
      isPrivate ? "private, no-store, max-age=0" : "public, max-age=31536000, immutable",
    );
    res.send(record.content);
  }),
);

// H-4 FIX: Verify ownership before allowing deletion.
// Previously any authenticated user could delete any file by publicId.
// Now we check that the publicId starts with the user's ID or folder prefix,
// and admins can delete anything.
router.delete(
  "/:publicId",
  protect,
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    if (!publicId) return res.status(400).json({ success: false, message: "No public_id provided" });

    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    const userId = String(req.user._id || req.user.id);
    const record = getUploadRecordByPublicId(publicId);

    if (!record) {
      return res.status(404).json({ success: false, message: "Upload not found" });
    }
    if (!isAdmin && String(record.userId || "") !== userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own files" });
    }

    await deleteImage(publicId);
    res.json({ success: true, message: "File deleted" });
  }),
);

export default router;
