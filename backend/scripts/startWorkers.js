// backend/scripts/startWorkers.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Worker startup script
// Initializes and starts all queue workers
// ─────────────────────────────────────────────────────────────

import { startAllWorkers, stopAllWorkers } from "../infrastructure/queues/workerManager.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🚀 START WORKERS
// =============================

const startWorkers = async () => {
  try {
    logInfo("Starting workers...");
    startAllWorkers();
    logInfo("Workers started successfully");
  } catch (err) {
    logError("Failed to start workers", err);
    process.exit(1);
  }
};

// =============================
// 🛑 GRACEFUL SHUTDOWN
// =============================

const gracefulShutdown = async (signal) => {
  logInfo(`Received ${signal}, shutting down workers...`);

  try {
    await stopAllWorkers();
    logInfo("Workers stopped successfully");
    process.exit(0);
  } catch (err) {
    logError("Error during shutdown", err);
    process.exit(1);
  }
};

// =============================
// 📡 SIGNAL HANDLERS
// =============================

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// =============================
// 🚀 START
// =============================

startWorkers();
