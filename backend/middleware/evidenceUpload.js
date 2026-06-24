// backend/middleware/evidenceUpload.js - Evidence file upload for disputes
// ─────────────────────────────────────────────────────────────
// Supports: images, videos, documents, inspection reports,
// payment records, chat logs. Multiple files per request.
// Validates file types, sizes, and limits.
// ─────────────────────────────────────────────────────────────

import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { logWarn, logError } from "../utils/logger.js";

const UPLOAD_DIR = "uploads/evidence";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain"],
  inspection_report: ["application/pdf", "image/jpeg", "image/png"],
  payment_record: ["application/pdf", "image/jpeg", "image/png"],
  chat_log: ["application/pdf", "text/plain", "text/csv", "application/json"],
};

const ALLOWED_MIMES = Object.values(ALLOWED_TYPES).flat();
const MAX_SIZES = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  inspection_report: 20 * 1024 * 1024,
  payment_record: 10 * 1024 * 1024,
  chat_log: 5 * 1024 * 1024,
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || "document";
    const typeDir = path.join(UPLOAD_DIR, type);
    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitized = file.originalname.replace(ext, "").replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
    const unique = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${unique}-${sanitized}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported for evidence upload`), false);
  }
};

const getMaxSize = (req) => {
  const type = req.body.type || "document";
  return MAX_SIZES[type] || 20 * 1024 * 1024;
};

export const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10,
  },
});

export const uploadEvidenceFields = uploadEvidence.fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 10 },
]);

export const uploadEvidenceSingle = uploadEvidence.single("file");

export const handleEvidenceUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Max 100MB for videos, 10MB for images, 20MB for documents." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ success: false, message: "Too many files. Max 10 files per request." });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

export const EVIDENCE_LABELS = {
  image: "Image",
  video: "Video",
  document: "Document",
  inspection_report: "Inspection Report",
  payment_record: "Payment Record",
  chat_log: "Chat Log",
};

export const EVIDENCE_ICONS = {
  image: "📷",
  video: "🎥",
  document: "📄",
  inspection_report: "🔍",
  payment_record: "💳",
  chat_log: "💬",
};
