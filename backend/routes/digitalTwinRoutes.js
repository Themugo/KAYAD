import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Simulations
  getSimulations,
  getSimulation,
  createSimulation,
  runSimulation,
  deleteSimulation,
  getSimulationHistory,
  compareSimulations,
  // Scenarios
  getScenarios,
  getScenario,
  createScenario,
  updateScenario,
  deleteScenario,
  runScenario,
  getScenarioTemplates,
  // Predictions
  getPredictions,
  generatePrediction,
  // Dashboard
  getDigitalTwinDashboard,
  // What-If
  whatIfAnalysis,
} from "../controllers/digitalTwinController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getDigitalTwinDashboard));

// ============================================
// SIMULATIONS
// ============================================

router.get("/simulations", asyncHandler(getSimulations));
router.get("/simulations/:id", validateObjectId, asyncHandler(getSimulation));
router.post("/simulations", allowRoles("admin", "superadmin"), asyncHandler(createSimulation));
router.post("/simulations/:id/run", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(runSimulation));
router.delete("/simulations/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteSimulation));
router.get("/simulations/history", asyncHandler(getSimulationHistory));
router.post("/simulations/compare", asyncHandler(compareSimulations));

// ============================================
// SCENARIOS
// ============================================

router.get("/scenarios", asyncHandler(getScenarios));
router.get("/scenarios/templates", asyncHandler(getScenarioTemplates));
router.get("/scenarios/:id", validateObjectId, asyncHandler(getScenario));
router.post("/scenarios", allowRoles("admin", "superadmin"), asyncHandler(createScenario));
router.put("/scenarios/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateScenario));
router.delete("/scenarios/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteScenario));
router.post("/scenarios/:id/run", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(runScenario));

// ============================================
// PREDICTIONS
// ============================================

router.get("/predictions", asyncHandler(getPredictions));
router.post("/predictions", asyncHandler(generatePrediction));

// ============================================
// WHAT-IF ANALYSIS
// ============================================

router.post("/what-if", asyncHandler(whatIfAnalysis));

export default router;
