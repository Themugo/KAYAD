// backend/services/aiFeatureFlagService.js
// Feature flag service for AI features

import FeatureFlag from '../models/FeatureFlag.js';
import { logInfo, logError } from '../utils/logger.js';

export class AIFeatureFlagService {
  constructor() {
    this.defaultFlags = {
      aiFraudDetection: {
        enabled: true,
        rolloutPercentage: 100,
        description: 'AI-powered fraud detection',
      },
      aiListingQuality: {
        enabled: true,
        rolloutPercentage: 100,
        description: 'AI-powered listing quality scoring',
      },
      aiDealerHealth: {
        enabled: true,
        rolloutPercentage: 50,
        description: 'AI-powered dealer health forecasting',
      },
      aiPricing: {
        enabled: true,
        rolloutPercentage: 100,
        description: 'AI-powered pricing recommendations',
      },
      aiSupport: {
        enabled: true,
        rolloutPercentage: 100,
        description: 'AI-powered support assistant',
      },
      aiLeadScoring: {
        enabled: true,
        rolloutPercentage: 50,
        description: 'AI-powered lead scoring',
      },
      aiDemand: {
        enabled: false,
        rolloutPercentage: 0,
        description: 'AI-powered demand forecasting',
      },
    };
  }

  /**
   * Check if an AI feature is enabled for a user
   */
  async isFeatureEnabled(featureName, userId = null) {
    try {
      const flag = await FeatureFlag.findOne({ name: featureName });
      
      if (!flag) {
        // Use default flag
        const defaultFlag = this.defaultFlags[featureName];
        if (!defaultFlag) {
          return false;
        }
        return this.checkRollout(defaultFlag, userId);
      }

      return this.checkRollout(flag, userId);
    } catch (error) {
      logError('Failed to check feature flag', { error: error.message });
      return false;
    }
  }

  checkRollout(flag, userId) {
    if (!flag.enabled) {
      return false;
    }

    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    if (!userId) {
      return false;
    }

    // Hash user ID to determine if they're in rollout
    const hash = this.hashUserId(userId);
    const percentage = hash % 100;
    
    return percentage < flag.rolloutPercentage;
  }

  hashUserId(userId) {
    let hash = 0;
    const str = userId.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * Enable a feature
   */
  async enableFeature(featureName, rolloutPercentage = 100) {
    try {
      const flag = await FeatureFlag.findOneAndUpdate(
        { name: featureName },
        {
          name: featureName,
          enabled: true,
          rolloutPercentage,
          description: this.defaultFlags[featureName]?.description || '',
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      logInfo(`Feature enabled: ${featureName}`, { rolloutPercentage });
      return flag;
    } catch (error) {
      logError('Failed to enable feature', { error: error.message });
      throw error;
    }
  }

  /**
   * Disable a feature
   */
  async disableFeature(featureName) {
    try {
      const flag = await FeatureFlag.findOneAndUpdate(
        { name: featureName },
        {
          enabled: false,
          rolloutPercentage: 0,
          updatedAt: new Date(),
        },
        { new: true }
      );

      logInfo(`Feature disabled: ${featureName}`);
      return flag;
    } catch (error) {
      logError('Failed to disable feature', { error: error.message });
      throw error;
    }
  }

  /**
   * Update rollout percentage
   */
  async updateRollout(featureName, rolloutPercentage) {
    try {
      const flag = await FeatureFlag.findOneAndUpdate(
        { name: featureName },
        {
          rolloutPercentage,
          enabled: rolloutPercentage > 0,
          updatedAt: new Date(),
        },
        { new: true }
      );

      logInfo(`Rollout updated: ${featureName}`, { rolloutPercentage });
      return flag;
    } catch (error) {
      logError('Failed to update rollout', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all AI feature flags
   */
  async getAllFlags() {
    try {
      const flags = await FeatureFlag.find({ name: /^ai/ });
      
      // Merge with defaults
      const allFlags = { ...this.defaultFlags };
      
      for (const flag of flags) {
        allFlags[flag.name] = {
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
          description: flag.description,
        };
      }

      return allFlags;
    } catch (error) {
      logError('Failed to get all flags', { error: error.message });
      throw error;
    }
  }

  /**
   * Get flag status for a specific user
   */
  async getUserFlags(userId) {
    try {
      const allFlags = await this.getAllFlags();
      const userFlags = {};

      for (const [featureName, flag] of Object.entries(allFlags)) {
        userFlags[featureName] = {
          enabled: this.checkRollout(flag, userId),
          rolloutPercentage: flag.rolloutPercentage,
          description: flag.description,
        };
      }

      return userFlags;
    } catch (error) {
      logError('Failed to get user flags', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize default flags
   */
  async initializeDefaults() {
    try {
      for (const [featureName, flag] of Object.entries(this.defaultFlags)) {
        await FeatureFlag.findOneAndUpdate(
          { name: featureName },
          {
            name: featureName,
            enabled: flag.enabled,
            rolloutPercentage: flag.rolloutPercentage,
            description: flag.description,
          },
          { upsert: true }
        );
      }

      logInfo('Default AI feature flags initialized');
    } catch (error) {
      logError('Failed to initialize default flags', { error: error.message });
      throw error;
    }
  }
}

export default new AIFeatureFlagService();
