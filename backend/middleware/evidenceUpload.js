import multer from "multer";
import path from "path";
import crypto from "crypto";
import { logWarn, logError } from "../utils/logger.js";
import { uploadImage } from "../config/cloudinary.js";
import { uploadToSupabase, isStorageConnected } from "../services/storage.service.js";

const MAGIC_BYTES = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/heic": [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  "video/mp4": [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  "video/webm": [0x1A, 0x45, 0xDF, 0xA3],
  "video/quicktime": [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
  "video/x-msvideo": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

const validateMagicBytes = (buffer, mimeType) => {
  const magic = MAGIC_BYTES[mimeType];
  if (!magic) return true;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
};

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

const ALLOWED_TYPE_KEYS = Object.keys(ALLOWED_TYPES);

const fileFilter = (req, file, cb) => {
  if (req.body.type && !ALLOWED_TYPE_KEYS.includes(req.body.type)) {
    return cb(new Error(`Invalid evidence type: ${req.body.type}`), false);
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not supported for evidence upload`), false);
  }
  if (!validateMagicBytes(file.buffer, file.mimetype)) {
    return cb(new Error(`File content does not match declared type ${file.mimetype}`), false);
  }
  cb(null, true);
};

const storage = multer.memoryStorage();

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

export const uploadEvidenceToCloudinary = async (file, type = "document") => {
  if (!file) throw new Error("No file provided");
  const folder = `kayad/evidence/${type}`;
  const isVideo = file.mimetype.startsWith("video/");

  let result;
  if (isStorageConnected()) {
    result = await uploadToSupabase(file, folder);
  } else {
    result = await uploadImage(file, folder, {
      generateVariants: !isVideo,
      preserveOriginal: true,
    });
  }

  return {
    url: result.url,
    public_id: result.public_id,
    thumb: result.thumb || result.url,
  };
};

export const uploadEvidenceMultipleToCloudinary = async (files, type = "document") => {
  if (!files || files.length === 0) return [];
  return Promise.all(files.map((f) => uploadEvidenceToCloudinary(f, type)));
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
