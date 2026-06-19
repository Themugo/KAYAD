import express from "express";
import multer from "multer";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import {
  createDispute,
  uploadEvidence,
  resolveDispute,
  submitAppeal,
  getDispute,
  getUserDisputes,
  getAllDisputes,
  addAdminNote,
} from "../controllers/disputeController.ts";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/webm",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images, PDFs, and videos are allowed."));
    }
  },
});

// =============================
// 📋 DISPUTE MANAGEMENT
// =============================

// Create dispute
router.post("/", protect, asyncHandler(createDispute));

// Upload evidence
router.post("/:disputeId/evidence", protect, upload.single("file"), asyncHandler(uploadEvidence));

// Get dispute details
router.get("/:disputeId", protect, asyncHandler(getDispute));

// Get user's disputes
router.get("/user/my-disputes", protect, asyncHandler(getUserDisputes));

// =============================
// ⚖️ ADMIN DISPUTE MANAGEMENT
// =============================

// Get all disputes (admin only)
router.get("/admin/all", protect, adminOnly, asyncHandler(getAllDisputes));

// Resolve dispute (admin only)
router.post("/:disputeId/resolve", protect, adminOnly, asyncHandler(resolveDispute));

// Add admin note (admin only)
router.post("/:disputeId/notes", protect, adminOnly, asyncHandler(addAdminNote));

// =============================
// 🔄 APPEALS
// =============================

// Submit appeal
router.post("/:disputeId/appeal", protect, asyncHandler(submitAppeal));

export default router;
