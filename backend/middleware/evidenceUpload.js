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

const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
  gif: [0x47, 0x49, 0x46, 0x38],
  heic: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x33],
  pdf: [0x25, 0x50, 0x44, 0x46],
  mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  webm: [0x1A, 0x45, 0xDF, 0xA3],
  avi: [0x52, 0x49, 0x46, 0x46],
};

const EXT_BY_MIME = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mp4",
  "video/x-msvideo": "avi",
  "application/pdf": "pdf",
  "application/msword": null,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": null,
  "application/vnd.ms-excel": null,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": null,
  "text/plain": null,
  "text/csv": null,
  "application/json": null,
};

function validateMagicBytes(filePath, mimeType) {
  const ext = EXT_BY_MIME[mimeType];
  if (!ext || !MAGIC_BYTES[ext]) return true;
  const expected = MAGIC_BYTES[ext];
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(expected.length);
  fs.readSync(fd, buffer, 0, expected.length, 0);
  fs.closeSync(fd);
  return expected.every((byte, i) => buffer[i] === byte);
}

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

const ALLOWED_TYPE_KEYS = Object.keys(ALLOWED_TYPES);

const fileFilter = (req, file, cb) => {
  if (req.body.type && !ALLOWED_TYPE_KEYS.includes(req.body.type)) {
    return cb(new Error(`Invalid evidence type: ${req.body.type}`), false);
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not supported for evidence upload`), false);
  }
  cb(null, true);
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

// Validate magic bytes for image/video/pdf files after upload
export const validateEvidenceContent = (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) files.push(...req.files);
    else Object.values(req.files).forEach((arr) => files.push(...arr));
  }
  for (const file of files) {
    if (!validateMagicBytes(file.path, file.mimetype)) {
      files.forEach((f) => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ success: false, message: `File content does not match declared type for ${file.originalname}` });
    }
  }
  next();
};

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
