// =============================
// 📡 SOCKET EMITTERS (FULL SAFE)
// =============================

import { getIO } from "../utils/io.js";
import { withRetry, createServiceConfig } from "../utils/retry.js";
import { recordMetric, incrementCounter } from "../config/metrics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { triggerAlert } from "../config/alerting.js";

// Socket service configuration with SRE
const socketConfig = createServiceConfig("socket", {
  circuitBreaker: true,
  onCircuitOpen: (key, failures, resetMs) => {
    triggerAlert({
      level: "warning",
      message: `Socket circuit breaker opened after ${failures} failures`,
      source: "socket",
      metrics: { failures, resetMs },
    });
  },
  fallback: async () => {
    logInfo("Socket unavailable, using fallback mode");
    incrementCounter("socket_fallback_used");
    return false;
  },
});

// Failed emit queue for retry
const failedEmitsQueue = [];
const MAX_QUEUE_SIZE = 1000;

// 🔥 SAFE EMIT
const emit = async (room, event, data) => {
  const startTime = Date.now();

  try {
    const io = getIO();
    if (!io) {
      logWarn("Socket not initialized", { room, event });
      incrementCounter("socket_not_initialized");

      // Queue failed emit for retry
      queueFailedEmit(room, event, data);
      return false;
    }

    await withRetry(
      () => {
        return new Promise((resolve, reject) => {
          try {
            io.to(room).emit(event, data);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        });
      },
      {
        ...socketConfig,
        timeoutMs: 5000,
        key: `socket_${event}`,
        onRetry: (err, attempt) => {
          logWarn(`Socket emit retry ${attempt}`, { room, event, error: err.message });
          incrementCounter("socket_emit_retry", { event, attempt });
        },
      },
    );

    const duration = Date.now() - startTime;
    recordMetric("socket_emit_duration", duration, { event });
    incrementCounter("socket_emit_success", { event });

    logInfo("Socket emit successful", { room, event });
    return true;
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("socket_emit_duration", duration, { event, status: "error" });
    incrementCounter("socket_emit_failure", { event, error_type: err.code || "unknown" });

    logError("Socket emit failed", err, { room, event, error: err.message });

    // Queue failed emit for retry
    if (err.code !== "CIRCUIT_BREAKER_OPEN") {
      queueFailedEmit(room, event, data);
    }

    return false;
  }
};

// Queue failed emits for retry
const queueFailedEmit = (room, event, data) => {
  if (failedEmitsQueue.length >= MAX_QUEUE_SIZE) {
    failedEmitsQueue.shift(); // Remove oldest
  }
  failedEmitsQueue.push({ room, event, data, timestamp: Date.now() });
  incrementCounter("socket_emit_queued");
};

// Retry failed emits
export const retryFailedEmits = async () => {
  if (failedEmitsQueue.length === 0) return;

  logInfo(`Retrying ${failedEmitsQueue.length} failed socket emits`);

  const queueCopy = [...failedEmitsQueue];
  failedEmitsQueue.length = 0; // Clear queue

  for (const item of queueCopy) {
    try {
      await emit(item.room, item.event, item.data);
      incrementCounter("socket_emit_retry_success");
    } catch (err) {
      // Re-queue if still failing
      queueFailedEmit(item.room, item.event, item.data);
      incrementCounter("socket_emit_retry_failure");
    }
  }
};

// =============================
// 💰 BID UPDATE
// =============================
export const emitBidUpdate = async (roomId, payload) => {
  await emit(`car_${roomId}`, "bidUpdate", {
    roomId,
    ...payload,
  });
};

// =============================
// 🔄 AUCTION PHASE UPDATE
// =============================
export const emitAuctionPhase = async (roomId, phase, payload = {}) => {
  await emit(`car_${roomId}`, "auctionPhase", {
    roomId,
    phase,
    timestamp: Date.now(),
    ...payload,
  });
};

// =============================
// 🏁 AUCTION END
// =============================
export const emitAuctionEnd = async (roomId, payload) => {
  await emit(`car_${roomId}`, "auctionEnded", {
    roomId,
    ...payload,
  });
};

// =============================
// ⏱ AUCTION EXTENDED (🔥 FIXED)
// =============================
export const emitAuctionExtended = async (roomId, newEndTime) => {
  await emit(`car_${roomId}`, "auctionExtended", {
    roomId,
    newEndTime,
    timeLeft: newEndTime - Date.now(),
  });
};

// =============================
// ⏱ TIMER UPDATE
// =============================
export const emitTimerUpdate = async (roomId, timeLeft) => {
  await emit(`car_${roomId}`, "auctionTimer", {
    roomId,
    timeLeft,
  });
};

// =============================
// 🔄 LISTING UPDATE (SHOWROOM)
// =============================
export const emitListingUpdate = async (carId, data) => {
  try {
    const io = getIO();
    if (!io) {
      logWarn("Socket not initialized for listing update", { carId });
      queueFailedEmit("showroom", "listingUpdate", { carId, ...data });
      return;
    }

    await withRetry(
      () => {
        return new Promise((resolve, reject) => {
          try {
            io.to("showroom").emit("listingUpdate", { carId, ...data });
            resolve(true);
          } catch (err) {
            reject(err);
          }
        });
      },
      {
        ...socketConfig,
        timeoutMs: 5000,
        key: "socket_listing_update",
        onRetry: (err, attempt) => {
          logWarn(`Listing update retry ${attempt}`, { carId, error: err.message });
          incrementCounter("socket_listing_update_retry", { attempt });
        },
      },
    );

    incrementCounter("socket_listing_update_success");
  } catch (err) {
    logError("Listing update emit error", err, { carId, error: err.message });
    incrementCounter("socket_listing_update_failure");

    if (err.code !== "CIRCUIT_BREAKER_OPEN") {
      queueFailedEmit("showroom", "listingUpdate", { carId, ...data });
    }
  }
};

// =============================
// 📊 SOCKET HEALTH CHECK
// =============================
export const getSocketHealth = () => {
  const io = getIO();
  return {
    initialized: !!io,
    queueSize: failedEmitsQueue.length,
    circuitBreakerOpen: false, // Would need to track this
  };
};
