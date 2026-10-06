import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { uploadMemory, handleUploadError } from "../middleware/upload.js";
import { uploadFile, uploadMultiple as uploadStorageMultiple, deleteMedia, createSignedStorageUrl } from "../services/storage.service.js";
import { createUploadRecord } from "../services/sqlUploadStore.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { getUploadRecord, getUploadRecordByPublicId } from "../services/sqlUploadStore.js";

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

    const isPrivate = ["documents", "receipts", "inspection", "escrow"].includes(folder);
    const result = await uploadFile(req.file, `kayad/${folder}`, {
      userId: String(req.user._id || req.user.id),
      visibility: isPrivate ? "private" : "public",
    });
    const record = createUploadRecord({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      folder,
      provider: "supabase",
      storagePath: result.path,
      publicId: result.public_id,
      url: result.url,
      thumb: result.thumb,
      userId: String(req.user._id || req.user.id),
      metadata: { bucket: result.bucket, visibility: result.visibility },
      checksum: result.checksum,
    });

    res.json({ success: true, id: record.id, url: result.url, public_id: result.public_id, thumb: result.thumb || result.url, card: result.thumb || result.url });
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

    const isPrivate = ["documents", "receipts", "inspection", "escrow"].includes(folder);
    const results = await uploadStorageMultiple(req.files, `kayad/${folder}`, { visibility: isPrivate ? "private" : "public" });
    const files = results.map((r, index) => {
      const file = req.files[index];
      const record = createUploadRecord({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        folder,
        provider: "supabase",
        storagePath: r.path,
        publicId: r.public_id,
        url: r.url,
        thumb: r.thumb,
        userId: String(req.user._id || req.user.id),
        metadata: { bucket: r.bucket, visibility: r.visibility },
      });
      return { id: record.id, url: r.url, public_id: r.public_id, thumb: r.thumb || r.url, card: r.thumb || r.url };
    });
    res.json({ success: true, files });
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
    const isPrivate = ["documents", "receipts", "inspection", "escrow"].includes(record.folder) || record.metadata?.includes('"visibility":"private"');
    const requesterId = String(req.user._id || req.user.id);
    if (isPrivate && !isAdmin && String(record.userId || "") !== requesterId) {
      return res.status(403).json({ success: false, code: "UPLOAD_FORBIDDEN", message: "You are not authorized to access this upload" });
    }

    if (!record.content) {
      const metadata = typeof record.metadata === "string" ? JSON.parse(record.metadata || "{}") : (record.metadata || {});
      if (record.provider === "supabase" && record.storagePath) {
        const bucket = metadata.bucket || (isPrivate ? process.env.SUPABASE_PRIVATE_BUCKET || "kayad-private" : process.env.SUPABASE_PUBLIC_BUCKET || "kayad-images");
        const target = isPrivate ? await createSignedStorageUrl(bucket, record.storagePath, 900) : record.url;
        if (target) return res.redirect(target);
      }
      if (record.url && !isPrivate) return res.redirect(record.url);
      return res.status(404).json({ success: false, message: "Upload content unavailable" });
    }

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

    const metadata = typeof record.metadata === "string" ? JSON.parse(record.metadata || "{}") : (record.metadata || {});
    await deleteMedia({ bucket: metadata.bucket || (record.folder && ["documents", "receipts", "inspection", "escrow"].includes(record.folder) ? process.env.SUPABASE_PRIVATE_BUCKET || "kayad-private" : process.env.SUPABASE_PUBLIC_BUCKET || "kayad-images"), path: record.storagePath || publicId });
    res.json({ success: true, message: "File deleted" });
  }),
);

export default router;
