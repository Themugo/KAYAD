// Backup Verification Service
// Automated backup integrity verification and restore testing

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { listBackups } from "./backupService.js";
import { recordMetric, incrementCounter } from "../config/metrics.js";

const execAsync = promisify(exec);

// =============================
// 🔍 BACKUP VERIFICATION
// =============================

export const verifyBackupIntegrity = async (filename) => {
  try {
    const backupDir = process.env.BACKUP_DIR || "./backups";
    const filepath = path.join(backupDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    logInfo("Starting backup integrity verification", { filename });

    // Check file exists and is readable
    const stats = fs.statSync(filepath);
    if (stats.size === 0) {
      throw new Error("Backup file is empty");
    }

    // Verify gzip integrity if compressed
    if (filename.endsWith(".gz")) {
      const { stdout, stderr } = await execAsync(`gzip -t "${filepath}"`);
      if (stderr) {
        throw new Error(`Gzip verification failed: ${stderr}`);
      }
    }

    // Verify mongodump archive structure
    const { stdout } = await execAsync(`mongodump --archive="${filepath}" --dryRun`);
    
    logInfo("Backup integrity verified", { filename, size: stats.size });
    
    recordMetric("backup_verification_success", 1, { filename });
    
    return {
      success: true,
      filename,
      size: stats.size,
      verified: true,
      timestamp: new Date(),
    };
  } catch (err) {
    logError("Backup verification failed", err, { filename });
    incrementCounter("backup_verification_failed", { filename });
    throw err;
  }
};

// =============================
// 🧪 RESTORE TEST
// =============================

export const testRestore = async (filename, testDatabase = "kayad_test_restore") => {
  try {
    const backupDir = process.env.BACKUP_DIR || "./backups";
    const filepath = path.join(backupDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    logInfo("Starting restore test", { filename, testDatabase });

    const startTime = Date.now();

    // Get MongoDB URI and replace database name
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not configured");
    }

    // Create test database URI
    const testUri = mongoUri.replace(/\/[^/]*$/, `/${testDatabase}`);

    // Restore to test database
    const command = filename.endsWith(".gz")
      ? `mongorestore --uri="${testUri}" --archive="${filepath}" --gzip`
      : `mongorestore --uri="${testUri}" --archive="${filepath}"`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      logWarn("Restore test stderr", { stderr });
    }

    const duration = Date.now() - startTime;

    // Verify restore by checking collection count
    const { stdout: collectionsOutput } = await execAsync(
      `mongosh "${testUri}" --quiet --eval "db.getCollectionNames().length"`
    );
    const collectionCount = parseInt(collectionsOutput.trim());

    // Verify document count
    const { stdout: docsOutput } = await execAsync(
      `mongosh "${testUri}" --quiet --eval "db.getCollectionNames().reduce((sum, name) => sum + db[name].countDocuments(), 0)"`
    );
    const documentCount = parseInt(docsOutput.trim());

    logInfo("Restore test completed", {
      filename,
      duration,
      collectionCount,
      documentCount,
    });

    recordMetric("restore_test_duration", duration, { filename });
    recordMetric("restore_test_collections", collectionCount, { filename });
    recordMetric("restore_test_documents", documentCount, { filename });

    // Clean up test database
    await execAsync(`mongosh "${testUri}" --quiet --eval "db.dropDatabase()"`);
    logInfo("Test database cleaned up", { testDatabase });

    return {
      success: true,
      filename,
      duration,
      collectionCount,
      documentCount,
      timestamp: new Date(),
    };
  } catch (err) {
    logError("Restore test failed", err, { filename });
    incrementCounter("restore_test_failed", { filename });
    
    // Attempt cleanup on failure
    try {
      const mongoUri = process.env.MONGODB_URI;
      const testUri = mongoUri.replace(/\/[^/]*$/, `/${testDatabase}`);
      await execAsync(`mongosh "${testUri}" --quiet --eval "db.dropDatabase()"`);
    } catch (cleanupErr) {
      logError("Failed to cleanup test database", cleanupErr);
    }
    
    throw err;
  }
};

// =============================
// 📊 AUTOMATED VERIFICATION
// =============================

export const runAutomatedVerification = async () => {
  try {
    logInfo("Starting automated backup verification");

    const backups = await listBackups();
    
    if (backups.length === 0) {
      logWarn("No backups found for verification");
      return { success: true, message: "No backups to verify" };
    }

    // Verify latest backup
    const latestBackup = backups[0];
    const verificationResult = await verifyBackupIntegrity(latestBackup.filename);

    // Test restore of latest backup (run weekly, not daily)
    const shouldTestRestore = process.env.RUN_RESTORE_TEST === "true";
    let restoreResult = null;

    if (shouldTestRestore) {
      restoreResult = await testRestore(latestBackup.filename);
    }

    logInfo("Automated verification completed", {
      backup: latestBackup.filename,
      verification: verificationResult.success,
      restoreTest: restoreResult?.success || "skipped",
    });

    return {
      success: true,
      backup: latestBackup.filename,
      verification: verificationResult,
      restoreTest: restoreResult,
      timestamp: new Date(),
    };
  } catch (err) {
    logError("Automated verification failed", err);
    incrementCounter("automated_verification_failed");
    throw err;
  }
};

// =============================
// 📈 VERIFICATION METRICS
// =============================

export const getVerificationMetrics = async () => {
  try {
    const backups = await listBackups();
    
    return {
      totalBackups: backups.length,
      latestBackup: backups[0]?.filename || null,
      latestBackupAge: backups[0]?.age || 0,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      verificationEnabled: process.env.BACKUP_VERIFICATION_ENABLED === "true",
      restoreTestEnabled: process.env.RUN_RESTORE_TEST === "true",
    };
  } catch (err) {
    logError("Failed to get verification metrics", err);
    throw err;
  }
};

export default {
  verifyBackupIntegrity,
  testRestore,
  runAutomatedVerification,
  getVerificationMetrics,
};
