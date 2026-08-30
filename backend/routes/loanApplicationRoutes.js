import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  createLoanApplication,
  getMyLoanApplications,
  getAllLoanApplications,
  updateLoanApplicationStatus,
} from "../controllers/loanApplicationController.js";

const router = express.Router();

router.post("/", protect, asyncHandler(createLoanApplication));
router.get("/my", protect, asyncHandler(getMyLoanApplications));
router.get("/all", protect, adminOnly, asyncHandler(getAllLoanApplications));
router.put("/:id/status", protect, adminOnly, validateObjectId, asyncHandler(updateLoanApplicationStatus));

export default router;
