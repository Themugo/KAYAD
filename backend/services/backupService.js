// backend/services/backupService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Automated database backup service
// Provides automated backup scheduling and management
// ─────────────────────────────────────────────────────────────

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logInfo, logError, logWarn } from "../utils/logger.js";

const execAsync = promisify(exec);

// =============================
// 📁 BACKUP CONFIGURATION
// =============================

const BACKUP_CONFIG = {
  enabled: process.env.BACKUP_ENABLED === "true",
  schedule: process.env.BACKUP_SCHEDULE || "0 2 * * *", // Daily at 2 AM
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "7"),
  backupDir: process.env.BACKUP_DIR || "./backups",
  compress: process.env.BACKUP_COMPRESS !== "false",
};

// =============================
// 🗄️ CREATE BACKUP
// =============================

export const createBackup = async () => {
  try {
    if (!BACKUP_CONFIG.enabled) {
      logInfo("Backup disabled by configuration");
      return { success: false, message: "Backup disabled" };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `kayad-backup-${timestamp}.gz`;
    const filepath = path.join(BACKUP_CONFIG.backupDir, filename);

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
    }

    // Get MongoDB URI
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not configured");
    }

    // Create backup using mongodump
    const command = BACKUP_CONFIG.compress
      ? `mongodump --uri="${mongoUri}" --archive="${filepath}" --gzip`
      : `mongodump --uri="${mongoUri}" --archive="${filepath}"`;

    logInfo("Starting database backup", { filename });

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      logWarn("Backup stderr", { stderr });
    }

    logInfo("Backup completed successfully", { filename, size: fs.statSync(filepath).size });

    // Clean old backups
    await cleanOldBackups();

    return {
      success: true,
      filename,
      filepath,
      size: fs.statSync(filepath).size,
      timestamp,
    };
  } catch (err) {
    logError("Backup failed", err);
    throw err;
  }
};

// =============================
// 🧹 CLEAN OLD BACKUPS
// =============================

export const cleanOldBackups = async () => {
  try {
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      return;
    }

    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    const now = Date.now();
    const maxAge = BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filepath = path.join(BACKUP_CONFIG.backupDir, file);
      const stats = fs.statSync(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        logInfo("Deleted old backup", { file, age });
      }
    }

    logInfo("Old backups cleaned", { retentionDays: BACKUP_CONFIG.retentionDays });
  } catch (err) {
    logError("Failed to clean old backups", err);
  }
};

// =============================
// 📋 LIST BACKUPS
// =============================

export const listBackups = async () => {
  try {
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    const backups = [];

    for (const file of files) {
      const filepath = path.join(BACKUP_CONFIG.backupDir, file);
      const stats = fs.statSync(filepath);

      backups.push({
        filename: file,
        filepath,
        size: stats.size,
        created: stats.mtime,
        age: Date.now() - stats.mtimeMs,
      });
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created - a.created);

    return backups;
  } catch (err) {
    logError("Failed to list backups", err);
    throw err;
  }
};

// =============================
// 📥 RESTORE BACKUP
// =============================

export const restoreBackup = async (filename) => {
  try {
    const filepath = path.join(BACKUP_CONFIG.backupDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not configured");
    }

    logInfo("Starting database restore", { filename });

    const command = filename.endsWith(".gz")
      ? `mongorestore --uri="${mongoUri}" --archive="${filepath}" --gzip`
      : `mongorestore --uri="${mongoUri}" --archive="${filepath}"`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      logWarn("Restore stderr", { stderr });
    }

    logInfo("Restore completed successfully", { filename });

    return {
      success: true,
      filename,
      timestamp: new Date(),
    };
  } catch (err) {
    logError("Restore failed", err);
    throw err;
  }
};

// =============================
// 🗑️ DELETE BACKUP
// =============================

export const deleteBackup = async (filename) => {
  try {
    const filepath = path.join(BACKUP_CONFIG.backupDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    fs.unlinkSync(filepath);

    logInfo("Backup deleted", { filename });

    return {
      success: true,
      filename,
    };
  } catch (err) {
    logError("Failed to delete backup", err);
    throw err;
  }
};

// =============================
// 📊 GET BACKUP STATUS
// =============================

export const getBackupStatus = async () => {
  try {
    const backups = await listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const latestBackup = backups[0] || null;

    return {
      enabled: BACKUP_CONFIG.enabled,
      schedule: BACKUP_CONFIG.schedule,
      retentionDays: BACKUP_CONFIG.retentionDays,
      backupDir: BACKUP_CONFIG.backupDir,
      totalBackups: backups.length,
      totalSize,
      latestBackup,
      oldestBackup: backups[backups.length - 1] || null,
    };
  } catch (err) {
    logError("Failed to get backup status", err);
    throw err;
  }
};

export default {
  createBackup,
  cleanOldBackups,
  listBackups,
  restoreBackup,
  deleteBackup,
  getBackupStatus,
};
