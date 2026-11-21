import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // AI Commands
  processAICommand,
  approveAICommand,
  rejectAICommand,
  // Conversations
  getConversations,
  getConversation,
  addMessageToConversation,
  // Prompts
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  executePrompt,
  // Knowledge
  getKnowledgeBase,
  addKnowledge,
  updateKnowledge,
  deleteKnowledge,
  // Workspaces
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  // Analytics
  getAIAnalytics,
  // Dashboard
  getAIDashboard,
  // Suggestions
  getAISuggestions,
  // Health
  getPlatformHealth,
  // History
  getCommandHistory,
  rollbackCommand,
  // Templates
  getCommandTemplates,
} from "../controllers/aiPlatformController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getAIDashboard));
router.get("/analytics", asyncHandler(getAIAnalytics));
router.get("/suggestions", asyncHandler(getAISuggestions));
router.get("/health", asyncHandler(getPlatformHealth));
router.get("/templates", asyncHandler(getCommandTemplates));

// ============================================
// AI COMMANDS
// ============================================

router.post("/command", asyncHandler(processAICommand));
router.post("/command/:commandId/approve", allowRoles("admin", "superadmin"), asyncHandler(approveAICommand));
router.post("/command/:commandId/reject", allowRoles("admin", "superadmin"), asyncHandler(rejectAICommand));
router.get("/history", asyncHandler(getCommandHistory));
router.post("/history/:commandId/rollback", allowRoles("admin", "superadmin"), asyncHandler(rollbackCommand));

// ============================================
// CONVERSATIONS
// ============================================

router.get("/conversations", asyncHandler(getConversations));
router.get("/conversations/:id", asyncHandler(getConversation));
router.post("/conversations/:conversationId/message", asyncHandler(addMessageToConversation));

// ============================================
// PROMPTS
// ============================================

router.get("/prompts", asyncHandler(getPrompts));
router.post("/prompts", allowRoles("admin", "superadmin"), asyncHandler(createPrompt));
router.put("/prompts/:id", allowRoles("admin", "superadmin"), asyncHandler(updatePrompt));
router.delete("/prompts/:id", allowRoles("admin", "superadmin"), asyncHandler(deletePrompt));
router.post("/prompts/execute", asyncHandler(executePrompt));

// ============================================
// KNOWLEDGE BASE
// ============================================

router.get("/knowledge", asyncHandler(getKnowledgeBase));
router.post("/knowledge", allowRoles("admin", "superadmin"), asyncHandler(addKnowledge));
router.put("/knowledge/:id", allowRoles("admin", "superadmin"), asyncHandler(updateKnowledge));
router.delete("/knowledge/:id", allowRoles("admin", "superadmin"), asyncHandler(deleteKnowledge));

// ============================================
// WORKSPACES
// ============================================

router.get("/workspaces", asyncHandler(getWorkspaces));
router.post("/workspaces", allowRoles("admin", "superadmin"), asyncHandler(createWorkspace));
router.put("/workspaces/:id", allowRoles("admin", "superadmin"), asyncHandler(updateWorkspace));
router.delete("/workspaces/:id", allowRoles("admin", "superadmin"), asyncHandler(deleteWorkspace));

export default router;
