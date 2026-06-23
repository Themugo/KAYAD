// backend/middleware/authorization.js
// ─────────────────────────────────────────────────────────────
// Centralized Authorization Middleware
// Provides resource-based and role-based authorization checks
// ─────────────────────────────────────────────────────────────

import Car from "../models/Car.js";
import User from "../models/User.js";
import Escrow from "../models/Escrow.js";
import InspectionOrder from "../models/InspectionOrder.js";

// =============================
// RESOURCE OWNERSHIP CHECK
// =============================
export const checkResourceOwnership = (Model, resourceParam = "id", ownerField = "dealer") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceParam];
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found"
        });
      }
      
      // Check if user owns the resource or is admin
      const isOwner = resource[ownerField]?.toString() === req.user.id ||
                      resource.user?.toString() === req.user.id ||
                      resource.requestedBy?.toString() === req.user.id ||
                      resource.buyer?.toString() === req.user.id ||
                      resource.seller?.toString() === req.user.id;
      
      const isAdmin = req.user.role === "admin" || req.user.role === "superadmin" || req.user.effectiveRole === "webhoist";
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource"
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization check failed"
      });
    }
  };
};

// =============================
// ROLE-BASED AUTHORIZATION WITH PERMISSIONS
// =============================
export const requirePermission = (permission) => {
  return (req, res, next) => {
    const user = req.user;
    
    // Superadmin and webhoist bypass all permission checks
    if (user.role === "superadmin" || user.effectiveRole === "webhoist") {
      return next();
    }
    
    // Check if user has the required permission
    const hasPermission = user.grantedPermissions?.includes(permission) &&
                        !user.revokedPermissions?.includes(permission);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }
    
    next();
  };
};

// =============================
// MULTI-ROLE AUTHORIZATION
// =============================
export const requireAnyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }
    
    // Superadmin and webhoist bypass role checks
    if (req.user.role === "superadmin" || req.user.effectiveRole === "webhoist") {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    
    next();
  };
};

// =============================
// RESOURCE-SPECIFIC AUTHORIZATION HELPERS
// =============================

// Check if user owns the car or is admin
export const checkCarOwnership = checkResourceOwnership(Car, "id", "dealer");

// Check if user owns the user resource or is admin (for profile access)
export const checkUserOwnership = (req, res, next) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user.id;
  const isAdmin = req.user.role === "admin" || req.user.role === "superadmin" || req.user.effectiveRole === "webhoist";
  
  if (targetUserId !== currentUserId && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "You can only access your own profile"
    });
  }
  
  next();
};

// Check if user owns the escrow or is admin
export const checkEscrowOwnership = checkResourceOwnership(Escrow, "id", "buyer");

// Check if user owns the inspection order or is the assigned inspector
export const checkInspectionOwnership = async (req, res, next) => {
  try {
    const order = await InspectionOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Inspection order not found"
      });
    }
    
    const isBuyer = order.buyer?.toString() === req.user.id;
    const isInspector = order.inspector?.toString() === req.user.id;
    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin" || req.user.effectiveRole === "webhoist";
    
    if (!isBuyer && !isInspector && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this inspection order"
      });
    }
    
    req.resource = order;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed"
    });
  }
};

// =============================
// PERMISSION CONSTANTS
// =============================
export const PERMISSIONS = {
  // User management
  MANAGE_USERS: "manage_users",
  DELETE_USERS: "delete_users",
  BAN_USERS: "ban_users",
  
  // Car management
  MANAGE_CARS: "manage_cars",
  DELETE_CARS: "delete_cars",
  APPROVE_CARS: "approve_cars",
  
  // Financial operations
  MANAGE_PAYMENTS: "manage_payments",
  MANAGE_ESCROW: "manage_escrow",
  RELEASE_ESCROW: "release_escrow",
  
  // Platform management
  MANAGE_CONFIG: "manage_config",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_AUCTIONS: "manage_auctions",
  
  // Content moderation
  MODERATE_CONTENT: "moderate_content",
  DELETE_REVIEWS: "delete_reviews",
  
  // Support operations
  VIEW_SUPPORT_TICKETS: "view_support_tickets",
  RESOLVE_DISPUTES: "resolve_disputes",
};
