// ============================================================
// KAYAD MEDIA EVENT ENGINE - MAIN ENTRY POINT
// ============================================================
// Central nervous system for KAYAD's live auction ecosystem

// Types & Event Definitions
export {
  AuctionEventType,
  EventPriority,
  EventCategory,
  getEventMetadata,
  createEvent,
  EventPayloadTemplates,
  validateEvent,
} from './types/index.js';

// Channel Management
export {
  ChannelType,
  ChannelAccess,
  ChannelConfig,
  EventChannelMapping,
  getChannelsForEvent,
  channelManager,
} from './channels/index.js';

// Services
export {
  mediaEventEngine,
  broadcastSync,
  commentaryService,
  failoverService,
} from './services/index.js';

// Audit & Replay
export { auditLogger } from './audit/auditLogger.js';
export { replayEngine } from './replay/replayEngine.js';

// Output Adapters
export {
  outputAdapterManager,
  LiveTextAdapter,
  MobileNotificationAdapter,
  EmailAdapter,
  SMSAdapter,
  PushNotificationAdapter,
  PartnerAPIAdapter,
  VideoOverlayAdapter,
} from './adapters/outputAdapters.js';

// Initialize all components
import { mediaEventEngine } from './services/mediaEventEngine.js';
import { channelManager } from './channels/channelManager.js';
import { auditLogger } from './audit/auditLogger.js';
import { replayEngine } from './replay/replayEngine.js';
import { broadcastSync } from './services/broadcastSync.js';
import { commentaryService } from './services/commentaryService.js';
import { failoverService } from './services/failoverService.js';
import { outputAdapterManager } from './adapters/outputAdapters.js';
import { logInfo } from '../utils/logger.js';

/**
 * Initialize the complete Media Event Engine
 */
export async function initializeMediaEventEngine() {
  logInfo('Initializing Media Event Engine...');

  try {
    // Initialize all components
    await channelManager.initialize();
    await auditLogger.initialize();
    await replayEngine.initialize();
    await broadcastSync.initialize();
    await commentaryService.initialize();
    await failoverService.initialize();
    await outputAdapterManager.initialize();
    await mediaEventEngine.initialize();

    logInfo('Media Event Engine initialized successfully');
    return true;
  } catch (error) {
    logInfo(`Media Event Engine initialization failed: ${error.message}`);
    return false;
  }
}

/**
 * Get complete system health
 */
export function getSystemHealth() {
  return {
    mediaEventEngine: mediaEventEngine.getHealth(),
    channelManager: channelManager.getHealth(),
    replayEngine: replayEngine.getHealth(),
    broadcastSync: broadcastSync.getMetrics(),
    commentaryService: commentaryService.getMetrics(),
    failoverService: failoverService.getSystemHealth(),
    outputAdapterManager: outputAdapterManager.getHealth(),
  };
}

/**
 * Get complete system metrics
 */
export function getSystemMetrics() {
  return {
    mediaEventEngine: mediaEventEngine.getMetrics(),
    channelManager: channelManager.getMetrics(),
    auditLogger: auditLogger.getMetrics(),
    replayEngine: replayEngine.getMetrics(),
    broadcastSync: broadcastSync.getMetrics(),
    commentaryService: commentaryService.getMetrics(),
    failoverService: failoverService.getMetrics(),
    outputAdapterManager: outputAdapterManager.getMetrics(),
  };
}

/**
 * Graceful shutdown
 */
export async function shutdownMediaEventEngine() {
  logInfo('Shutting down Media Event Engine...');

  await mediaEventEngine.shutdown();
  channelManager.retryFailedDeliveries();

  logInfo('Media Event Engine shutdown complete');
}

export default {
  initializeMediaEventEngine,
  getSystemHealth,
  getSystemMetrics,
  shutdownMediaEventEngine,
  mediaEventEngine,
  broadcastSync,
  commentaryService,
  failoverService,
  channelManager,
  auditLogger,
  replayEngine,
  outputAdapterManager,
};
