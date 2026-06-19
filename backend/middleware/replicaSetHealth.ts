// backend/middleware/replicaSetHealth.js
// ─────────────────────────────────────────────────────────────
// Replica Set Health Check Middleware
// Monitors MongoDB replica set health and provides status
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

export const checkReplicaSetHealth = async (req, res, next) => {
  try {
    // Only check if replica set is configured
    if (!process.env.MONGO_REPLICA_SET_NAME) {
      req.replicaSetHealth = {
        status: "not_configured",
        message: "Replica set not configured",
      };
      return next();
    }

    const admin = mongoose.connection.db.admin();
    const status = await admin.command({ replSetGetStatus: 1 });

    const health = {
      status: "healthy",
      name: status.set,
      primary: status.members.find((m) => m.stateStr === "PRIMARY")?.name || null,
      secondaries: status.members.filter((m) => m.stateStr === "SECONDARY").map((m) => m.name),
      arbiters: status.members.filter((m) => m.stateStr === "ARBITER").map((m) => m.name),
      members: status.members.map((m) => ({
        name: m.name,
        state: m.stateStr,
        uptime: m.uptime,
        optimeDate: m.optimeDate,
        lastHeartbeat: m.lastHeartbeat ? new Date(m.lastHeartbeat.$date) : null,
        pingMs: m.pingMs,
        lag: m.optimeDate ? new Date() - new Date(m.optimeDate) : 0,
      })),
      lag: status.members.map((m) => ({
        name: m.name,
        optimeDate: m.optimeDate,
        lag: m.optimeDate ? new Date() - new Date(m.optimeDate) : 0,
      })),
    };

    // Check if primary is available
    if (!health.primary) {
      health.status = "degraded";
      health.message = "No primary available";
    }

    // Check if secondaries are available
    if (health.secondaries.length === 0) {
      health.status = "degraded";
      health.message = "No secondaries available";
    }

    // Check replication lag
    const maxLag = Math.max(...health.lag.map((l) => l.lag));
    if (maxLag > 60000) {
      // More than 1 minute lag
      health.status = "degraded";
      health.message = `High replication lag: ${maxLag}ms`;
    }

    req.replicaSetHealth = health;
    next();
  } catch (error) {
    console.error("Replica set health check failed:", error.message);
    req.replicaSetHealth = {
      status: "error",
      error: error.message,
    };
    next();
  }
};

export const requireReplicaSetHealth = (req, res, next) => {
  const health = req.replicaSetHealth;

  if (!health || health.status === "error") {
    return res.status(503).json({
      success: false,
      message: "Database unavailable",
      health: health,
    });
  }

  if (health.status === "degraded") {
    return res.status(503).json({
      success: false,
      message: health.message || "Database in degraded state",
      health: health,
    });
  }

  next();
};
