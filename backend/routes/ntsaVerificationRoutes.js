import express from "express";
import { protect, adminOnly, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { queueNtsaVerificationSchema, processNtsaVerificationSchema, addNtsaDocumentSchema } from "../validation/ntsa.schema.js";
import NtsaVerificationRequest from "../models/NtsaVerificationRequest.js";
import Car from "../models/Car.js";

const router = express.Router();
router.use(protect);

// List all verification requests (admin)
router.get("/", adminOnly, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const requests = await NtsaVerificationRequest.find(filter)
    .populate("car", "title brand model year price images")
    .populate("requestedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, requests });
}));

// Get verification status for a specific car (any authenticated user)
router.get("/car/:carId/status", asyncHandler(async (req, res) => {
  const request = await NtsaVerificationRequest.findOne({ car: req.params.carId })
    .sort({ createdAt: -1 })
    .populate("reviewedBy", "name")
    .lean();

  const car = await Car.findById(req.params.carId).select("ntsaVerified dutyStatus logbookVerified").lean();

  res.json({
    success: true,
    status: request?.status || "none",
    verified: car?.ntsaVerified || false,
    dutyStatus: car?.dutyStatus || "unknown",
    request,
  });
}));

// Request verification for own car (dealer/owner) or admin-enqueue
router.post("/", validate(queueNtsaVerificationSchema), asyncHandler(async (req, res) => {
  const { carId } = req.body;
  if (!carId) return res.status(400).json({ success: false, message: "carId required" });

  const car = await Car.findById(carId);
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });

  // Only allow owner or admin to request
  const isOwner = String(car.dealer || car.user) === String(req.user.id);
  const isStaff = ["admin", "superadmin", "moderator"].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ success: false, message: "Only the car owner or admin can request verification" });
  }

  const existing = await NtsaVerificationRequest.findOne({ car: carId, status: { $in: ["pending", "in_review"] } });
  if (existing) return res.status(409).json({ success: false, message: "Car already queued for verification" });

  const request = await NtsaVerificationRequest.create({
    car: carId,
    requestedBy: req.user.id,
    dutyStatus: car.dutyStatus || "unknown",
  });

  res.json({ success: true, request });
}));

// Process a verification request (approve/reject)
router.post("/:id/process", adminOnly, validate(processNtsaVerificationSchema), asyncHandler(async (req, res) => {
  const { status, adminNotes, dutyStatus, chassisVerified, logbookVerified, importVerified } = req.body;
  if (!["passed", "failed"].includes(status)) {
    return res.status(400).json({ success: false, message: "status must be 'passed' or 'failed'" });
  }

  const request = await NtsaVerificationRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: "Request not found" });

  request.status = status;
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  if (adminNotes !== undefined) request.adminNotes = adminNotes;
  if (dutyStatus !== undefined) request.dutyStatus = dutyStatus;
  if (chassisVerified !== undefined) request.chassisVerified = chassisVerified;
  if (logbookVerified !== undefined) request.logbookVerified = logbookVerified;
  if (importVerified !== undefined) request.importVerified = importVerified;
  await request.save();

  if (status === "passed") {
    await Car.findByIdAndUpdate(request.car, {
      ntsaVerified: true,
      logbookVerified: request.logbookVerified,
      dutyStatus: request.dutyStatus,
      verifiedBy: req.user.id,
    });
  }

  res.json({ success: true, request });
}));

// Upload supporting documents for a request (admin or requestor)
router.post("/:id/documents", validate(addNtsaDocumentSchema), asyncHandler(async (req, res) => {
  const { url, label } = req.body;
  if (!url) return res.status(400).json({ success: false, message: "url required" });

  const request = await NtsaVerificationRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: "Request not found" });

  const isRequestor = String(request.requestedBy) === String(req.user.id);
  const isStaff = ["admin", "superadmin", "moderator"].includes(req.user.role);
  if (!isRequestor && !isStaff) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  request.documents.push({ url, label: label || "Supporting document" });
  await request.save();

  res.json({ success: true, request });
}));

export default router;
