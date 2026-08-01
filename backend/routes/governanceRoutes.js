import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Dashboard
  getGovernanceDashboard,
  // Policies
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  // Change Requests
  getChangeRequests,
  getChangeRequest,
  createChangeRequest,
  submitForApproval,
  approveChangeRequest,
  rejectChangeRequest,
  // Approval Rules
  getApprovalRules,
  createApprovalRule,
  updateApprovalRule,
  // Feature Lifecycle
  getFeatureLifecycles,
  createFeatureLifecycle,
  updateFeatureStage,
  // Risks
  getRisks,
  createRisk,
  updateRiskStatus,
  // Standards
  getStandards,
  createStandard,
  // Country Rules
  getCountryRules,
  createCountryRule,
  // Partner Requirements
  getPartnerRequirements,
  createPartnerRequirement,
  // Releases
  getReleases,
  createRelease,
  updateReleaseStatus,
  // Decisions
  getDecisions,
  createDecision,
  // Audit
  getAuditLogs,
  // Compliance
  getComplianceDashboard,
  // AI Help
  getGovernanceHelp,
  // Reports
  getGovernanceReport,
} from "../controllers/governanceController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getGovernanceDashboard));

// Policies
router.get("/policies", asyncHandler(getPolicies));
router.get("/policies/:id", validateObjectId, asyncHandler(getPolicy));
router.post("/policies", allowRoles("admin", "superadmin"), asyncHandler(createPolicy));
router.put("/policies/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updatePolicy));

// Change Requests
router.get("/changes", asyncHandler(getChangeRequests));
router.get("/changes/:id", validateObjectId, asyncHandler(getChangeRequest));
router.post("/changes", allowRoles("admin", "superadmin", "manager"), asyncHandler(createChangeRequest));
router.post("/changes/:id/submit", validateObjectId, asyncHandler(submitForApproval));
router.post("/changes/:id/approve", validateObjectId, allowRoles("admin", "superadmin", "executive"), asyncHandler(approveChangeRequest));
router.post("/changes/:id/reject", validateObjectId, allowRoles("admin", "superadmin", "executive"), asyncHandler(rejectChangeRequest));

// Approval Rules
router.get("/approvals", asyncHandler(getApprovalRules));
router.post("/approvals", allowRoles("admin", "superadmin"), asyncHandler(createApprovalRule));
router.put("/approvals/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateApprovalRule));

// Feature Lifecycle
router.get("/features", asyncHandler(getFeatureLifecycles));
router.post("/features", allowRoles("admin", "superadmin", "manager"), asyncHandler(createFeatureLifecycle));
router.put("/features/:id/stage", validateObjectId, allowRoles("admin", "superadmin", "manager"), asyncHandler(updateFeatureStage));

// Risks
router.get("/risks", asyncHandler(getRisks));
router.post("/risks", allowRoles("admin", "superadmin", "executive"), asyncHandler(createRisk));
router.put("/risks/:id", validateObjectId, allowRoles("admin", "superadmin", "executive"), asyncHandler(updateRiskStatus));

// Standards
router.get("/standards", asyncHandler(getStandards));
router.post("/standards", allowRoles("admin", "superadmin"), asyncHandler(createStandard));

// Country Rules
router.get("/countries", asyncHandler(getCountryRules));
router.post("/countries", allowRoles("admin", "superadmin"), asyncHandler(createCountryRule));

// Partner Requirements
router.get("/partners", asyncHandler(getPartnerRequirements));
router.post("/partners", allowRoles("admin", "superadmin"), asyncHandler(createPartnerRequirement));

// Releases
router.get("/releases", asyncHandler(getReleases));
router.post("/releases", allowRoles("admin", "superadmin"), asyncHandler(createRelease));
router.put("/releases/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateReleaseStatus));

// Decisions
router.get("/decisions", asyncHandler(getDecisions));
router.post("/decisions", allowRoles("admin", "superadmin", "executive"), asyncHandler(createDecision));

// Audit
router.get("/audit", asyncHandler(getAuditLogs));

// Compliance
router.get("/compliance", asyncHandler(getComplianceDashboard));

// AI Help
router.post("/help", asyncHandler(getGovernanceHelp));

// Reports
router.get("/reports", asyncHandler(getGovernanceReport));

export default router;
