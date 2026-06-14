// backend/scripts/backup.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database backup script
// Runs automated database backups
// ─────────────────────────────────────────────────────────────

import { createBackup, getBackupStatus } from "../services/backupService.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🚀 RUN BACKUP
// =============================

const runBackup = async () => {
  try {
    logInfo("Starting database backup script");
    
    const result = await createBackup();
    
    if (result.success) {
      logInfo("Backup completed successfully", result);
      console.log("\n=== Backup Summary ===");
      console.log(`Filename: ${result.filename}`);
      console.log(`Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Timestamp: ${result.timestamp}`);
    } else {
      logInfo("Backup skipped", { message: result.message });
      console.log(`\nBackup skipped: ${result.message}`);
    }
    
    process.exit(0);
  } catch (err) {
    logError("Backup script failed", err);
    console.error("❌ Backup failed:", err.message);
    process.exit(1);
  }
};

// =============================
// 📊 SHOW STATUS
// =============================

const showStatus = async () => {
  try {
    const status = await getBackupStatus();
    
    console.log("\n=== Backup Status ===");
    console.log(`Enabled: ${status.enabled}`);
    console.log(`Schedule: ${status.schedule}`);
    console.log(`Retention: ${status.retentionDays} days`);
    console.log(`Directory: ${status.backupDir}`);
    console.log(`Total Backups: ${status.totalBackups}`);
    console.log(`Total Size: ${(status.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Latest Backup: ${status.latestBackup ? status.latestBackup.filename : "None"}`);
    
    process.exit(0);
  } catch (err) {
    logError("Status check failed", err);
    console.error("❌ Status check failed:", err.message);
    process.exit(1);
  }
};

// =============================
// 🚀 START
// =============================

const command = process.argv[2];

if (command === "status") {
  showStatus();
} else {
  runBackup();
}
