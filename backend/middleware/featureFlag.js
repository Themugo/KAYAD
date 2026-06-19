// backend/middleware/featureFlag.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Feature Flag middleware
// Express middleware for feature flagging
// ─────────────────────────────────────────────────────────────

import { isFlagEnabled, evaluateFlag } from "../services/featureFlagService.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🚦 FEATURE FLAG MIDDLEWARE
// =============================

export const featureFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const { defaultValue = true, errorMessage = "Feature not available", redirectUrl = null } = options;

      const user = req.user || null;
      const dealer = req.dealer || null;

      const enabled = await isFlagEnabled(key, user, dealer);

      if (!enabled) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Add flag status to request for downstream use
      req.featureFlags = req.featureFlags || {};
      req.featureFlags[key] = enabled;

      next();
    } catch (err) {
      logError("Feature flag middleware error", err);
      // On error, allow request to proceed (fail-open for backwards compatibility)
      next();
    }
  };
};

// =============================
// 🔒 REQUIRE FEATURE FLAG MIDDLEWARE
// =============================

export const requireFeatureFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        defaultValue = false,
        errorMessage = "This feature is currently unavailable",
        redirectUrl = null,
      } = options;

      const user = req.user || null;
      const dealer = req.dealer || null;

      const enabled = await isFlagEnabled(key, user, dealer);

      if (!enabled) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Add flag status to request for downstream use
      req.featureFlags = req.featureFlags || {};
      req.featureFlags[key] = enabled;

      next();
    } catch (err) {
      logError("Require feature flag middleware error", err);
      // On error, block request (fail-closed for required features)
      return res.status(403).json({
        success: false,
        message: "Feature check failed",
      });
    }
  };
};

// =============================
// 📊 EVALUATE FEATURE FLAG MIDDLEWARE
// =============================

export const evaluateFeatureFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const { defaultValue = true, errorMessage = "Feature not available", redirectUrl = null } = options;

      const user = req.user || null;
      const dealer = req.dealer || null;

      const enabled = await evaluateFlag(key, user, dealer);

      if (!enabled) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Add flag status to request for downstream use
      req.featureFlags = req.featureFlags || {};
      req.featureFlags[key] = enabled;

      next();
    } catch (err) {
      logError("Evaluate feature flag middleware error", err);
      // On error, allow request to proceed (fail-open for backwards compatibility)
      next();
    }
  };
};

// =============================
// 🌍 ENVIRONMENT FLAG MIDDLEWARE
// =============================

export const environmentFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        defaultValue = true,
        errorMessage = "Feature not available in this environment",
        redirectUrl = null,
      } = options;

      const currentEnv = process.env.NODE_ENV || "development";

      // Get flag to check environment targeting
      const { getFlag } = await import("../services/featureFlagService.js");
      const flag = await getFlag(key);

      if (!flag) {
        // Flag not found, use default value
        if (defaultValue) {
          return next();
        }
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check if current environment is in allowed environments
      if (!flag.environments.includes(currentEnv)) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      next();
    } catch (err) {
      logError("Environment flag middleware error", err);
      // On error, allow request to proceed
      next();
    }
  };
};

// =============================
// 👤 ROLE FLAG MIDDLEWARE
// =============================

export const roleFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const { defaultValue = true, errorMessage = "Feature not available for your role", redirectUrl = null } = options;

      const user = req.user || null;

      if (!user) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Get flag to check role targeting
      const { getFlag } = await import("../services/featureFlagService.js");
      const flag = await getFlag(key);

      if (!flag) {
        // Flag not found, use default value
        if (defaultValue) {
          return next();
        }
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check if user role is in allowed roles
      if (flag.roles.length > 0 && !flag.roles.includes(user.role)) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      next();
    } catch (err) {
      logError("Role flag middleware error", err);
      // On error, allow request to proceed
      next();
    }
  };
};

// =============================
// 🏪 DEALER FLAG MIDDLEWARE
// =============================

export const dealerFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        defaultValue = true,
        errorMessage = "Feature not available for your dealership",
        redirectUrl = null,
      } = options;

      const dealer = req.dealer || null;

      if (!dealer) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: "Dealer authentication required",
        });
      }

      // Get flag to check dealer targeting
      const { getFlag } = await import("../services/featureFlagService.js");
      const flag = await getFlag(key);

      if (!flag) {
        // Flag not found, use default value
        if (defaultValue) {
          return next();
        }
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check if dealer is in allowed dealers
      if (flag.dealers.length > 0 && !flag.dealers.includes(dealer._id)) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      next();
    } catch (err) {
      logError("Dealer flag middleware error", err);
      // On error, allow request to proceed
      next();
    }
  };
};

// =============================
// 📊 PERCENTAGE ROLLOUT MIDDLEWARE
// =============================

export const percentageRolloutFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const { defaultValue = true, errorMessage = "Feature not currently available", redirectUrl = null } = options;

      const user = req.user || null;
      const dealer = req.dealer || null;

      const enabled = await evaluateFlag(key, user, dealer);

      if (!enabled) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      next();
    } catch (err) {
      logError("Percentage rollout flag middleware error", err);
      // On error, allow request to proceed
      next();
    }
  };
};

// =============================
// 🎯 COMBINED FLAG MIDDLEWARE
// =============================

export const combinedFlag = (key, options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        defaultValue = true,
        errorMessage = "Feature not available",
        redirectUrl = null,
        checkEnvironment = true,
        checkRole = true,
        checkDealer = true,
        checkPercentage = true,
      } = options;

      const user = req.user || null;
      const dealer = req.dealer || null;

      // Get flag
      const { getFlag } = await import("../services/featureFlagService.js");
      const flag = await getFlag(key);

      if (!flag) {
        // Flag not found, use default value
        if (defaultValue) {
          return next();
        }
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check if flag is globally enabled
      if (!flag.enabled) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check environment
      if (checkEnvironment) {
        const currentEnv = process.env.NODE_ENV || "development";
        if (!flag.environments.includes(currentEnv)) {
          if (redirectUrl) {
            return res.redirect(redirectUrl);
          }
          return res.status(403).json({
            success: false,
            message: "Feature not available in this environment",
          });
        }
      }

      // Check role
      if (checkRole && flag.roles.length > 0 && user) {
        if (!flag.roles.includes(user.role)) {
          if (redirectUrl) {
            return res.redirect(redirectUrl);
          }
          return res.status(403).json({
            success: false,
            message: "Feature not available for your role",
          });
        }
      }

      // Check dealer
      if (checkDealer && flag.dealers.length > 0 && dealer) {
        if (!flag.dealers.includes(dealer._id)) {
          if (redirectUrl) {
            return res.redirect(redirectUrl);
          }
          return res.status(403).json({
            success: false,
            message: "Feature not available for your dealership",
          });
        }
      }

      // Check percentage rollout
      if (checkPercentage && flag.type === "percentage") {
        const enabled = await evaluateFlag(key, user, dealer);
        if (!enabled) {
          if (redirectUrl) {
            return res.redirect(redirectUrl);
          }
          return res.status(403).json({
            success: false,
            message: errorMessage,
          });
        }
      }

      // Add flag status to request
      req.featureFlags = req.featureFlags || {};
      req.featureFlags[key] = true;

      next();
    } catch (err) {
      logError("Combined flag middleware error", err);
      // On error, allow request to proceed
      next();
    }
  };
};

export default {
  featureFlag,
  requireFeatureFlag,
  evaluateFeatureFlag,
  environmentFlag,
  roleFlag,
  dealerFlag,
  percentageRolloutFlag,
  combinedFlag,
};
