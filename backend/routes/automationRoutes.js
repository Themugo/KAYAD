import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Workflows
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
  pauseWorkflow,
  simulateWorkflow,
  // Business Rules
  getBusinessRules,
  getBusinessRuleById,
  createBusinessRule,
  updateBusinessRule,
  deleteBusinessRule,
  evaluateRules,
  // Approval Chains
  getApprovalChains,
  getApprovalChainById,
  createApprovalChain,
  updateApprovalChain,
  deleteApprovalChain,
  initiateApproval,
  // Tasks
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  escalateTask,
  // Notification Templates
  getNotificationTemplates,
  getNotificationTemplateById,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  previewNotification,
  // Scheduled Jobs
  getScheduledJobs,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  runScheduledJobNow,
  // Logs
  getWorkflowLogs,
  // Dashboard
  getAutomationStats,
  // Templates & Types
  getWorkflowTemplates,
  getTriggerTypes,
  getActionTypes,
  // AI
  getAISuggestions,
} from "../controllers/automationController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard & Stats
router.get("/stats", asyncHandler(getAutomationStats));
router.get("/logs", asyncHandler(getWorkflowLogs));
router.get("/ai-suggestions", asyncHandler(getAISuggestions));

// Workflow Templates
router.get("/templates", asyncHandler(getWorkflowTemplates));
router.get("/trigger-types", asyncHandler(getTriggerTypes));
router.get("/action-types", asyncHandler(getActionTypes));

// ============================================
// WORKFLOWS
// ============================================

router.get("/workflows", asyncHandler(getWorkflows));
router.get("/workflows/:id", validateObjectId, asyncHandler(getWorkflowById));
router.post("/workflows", allowRoles("admin", "superadmin", "editor"), asyncHandler(createWorkflow));
router.put("/workflows/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateWorkflow));
router.delete("/workflows/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteWorkflow));
router.post("/workflows/:id/publish", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(publishWorkflow));
router.post("/workflows/:id/pause", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(pauseWorkflow));
router.post("/workflows/:id/simulate", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(simulateWorkflow));

// ============================================
// BUSINESS RULES
// ============================================

router.get("/rules", asyncHandler(getBusinessRules));
router.get("/rules/:id", validateObjectId, asyncHandler(getBusinessRuleById));
router.post("/rules", allowRoles("admin", "superadmin"), asyncHandler(createBusinessRule));
router.put("/rules/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateBusinessRule));
router.delete("/rules/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteBusinessRule));
router.post("/rules/evaluate", asyncHandler(evaluateRules));

// ============================================
// APPROVAL CHAINS
// ============================================

router.get("/approvals", asyncHandler(getApprovalChains));
router.get("/approvals/:id", validateObjectId, asyncHandler(getApprovalChainById));
router.post("/approvals", allowRoles("admin", "superadmin"), asyncHandler(createApprovalChain));
router.put("/approvals/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateApprovalChain));
router.delete("/approvals/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteApprovalChain));
router.post("/approvals/initiate", asyncHandler(initiateApproval));

// ============================================
// TASKS
// ============================================

router.get("/tasks", asyncHandler(getTasks));
router.get("/tasks/:id", validateObjectId, asyncHandler(getTaskById));
router.post("/tasks", asyncHandler(createTask));
router.put("/tasks/:id", validateObjectId, asyncHandler(updateTask));
router.post("/tasks/:id/complete", validateObjectId, asyncHandler(completeTask));
router.post("/tasks/:id/escalate", validateObjectId, asyncHandler(escalateTask));

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

router.get("/templates/notifications", asyncHandler(getNotificationTemplates));
router.get("/templates/notifications/:id", validateObjectId, asyncHandler(getNotificationTemplateById));
router.post("/templates/notifications", allowRoles("admin", "superadmin", "editor"), asyncHandler(createNotificationTemplate));
router.put("/templates/notifications/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateNotificationTemplate));
router.delete("/templates/notifications/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteNotificationTemplate));
router.post("/templates/notifications/preview", asyncHandler(previewNotification));

// ============================================
// SCHEDULED JOBS
// ============================================

router.get("/scheduled", asyncHandler(getScheduledJobs));
router.post("/scheduled", allowRoles("admin", "superadmin"), asyncHandler(createScheduledJob));
router.put("/scheduled/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateScheduledJob));
router.delete("/scheduled/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteScheduledJob));
router.post("/scheduled/:id/run", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(runScheduledJobNow));

export default router;
