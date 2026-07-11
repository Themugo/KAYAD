// src/utils/ownership.js
// ============================================================
// RESOURCE OWNERSHIP VALIDATION
// Ensures users can only access/modify their own resources
// ============================================================

import { useAuth } from '../context/AuthContext';

/**
 * Resource ownership configuration
 * Maps resource types to their owner field in the data
 */
export const OWNERSHIP_FIELDS = {
  cars: 'dealer_id',
  messages: 'sender_id',
  conversations: 'user_id',
  notifications: 'user_id',
  reviews: 'reviewer_id',
  favorites: 'user_id',
  payments: 'user_id',
  escrows: 'buyer_id',
  bids: 'bidder_id',
};

/**
 * Validate if the current user owns a resource
 * @param {Object} resource - The resource to check
 * @param {string} resourceType - Type of resource (key from OWNERSHIP_FIELDS)
 * @param {Object} user - Current user object
 * @returns {boolean}
 */
export function isOwner(resource, resourceType, user) {
  if (!resource || !user) return false;
  
  const ownerField = OWNERSHIP_FIELDS[resourceType];
  if (!ownerField) return false;
  
  return resource[ownerField] === user.id || resource[ownerField] === user._id;
}

/**
 * Validate ownership and throw if not owner
 * @param {Object} resource - The resource to check
 * @param {string} resourceType - Type of resource
 * @param {Object} user - Current user object
 * @param {string} action - Action being performed (for error message)
 */
export function requireOwnership(resource, resourceType, user, action = 'access') {
  if (!isOwner(resource, resourceType, user)) {
    const error = new Error(`You do not have permission to ${action} this resource`);
    error.status = 403;
    error.code = 'OWNERSHIP_DENIED';
    throw error;
  }
  return true;
}

/**
 * Filter array to only include resources owned by user
 * @param {Array} resources - Array of resources
 * @param {string} resourceType - Type of resource
 * @param {Object} user - Current user object
 * @returns {Array}
 */
export function filterOwnedResources(resources, resourceType, user) {
  if (!resources || !Array.isArray(resources)) return [];
  if (!user) return [];
  
  // Admins can see all resources
  if (user.role === 'admin' || user.role === 'superadmin') {
    return resources;
  }
  
  return resources.filter(resource => isOwner(resource, resourceType, user));
}

/**
 * Check if user can perform action on resource
 * @param {Object} user - Current user object
 * @param {Object} resource - Resource to check
 * @param {string} action - Action: 'read', 'update', 'delete'
 * @returns {boolean}
 */
export function canPerformAction(user, resource, action) {
  if (!user) return false;
  
  // Superadmin can do anything
  if (user.role === 'superadmin') return true;
  
  // Admin can read/update all, but only delete owned
  if (user.role === 'admin') {
    return action === 'delete' ? isOwner(resource, getResourceType(resource), user) : true;
  }
  
  // Regular users can only manage their own resources
  const resourceType = getResourceType(resource);
  
  switch (action) {
    case 'read':
      return isOwner(resource, resourceType, user);
    case 'update':
    case 'delete':
      return isOwner(resource, resourceType, user);
    default:
      return false;
  }
}

/**
 * Infer resource type from resource object
 * @param {Object} resource - Resource object
 * @returns {string|null}
 */
function getResourceType(resource) {
  for (const [type, field] of Object.entries(OWNERSHIP_FIELDS)) {
    if (field in resource) return type;
  }
  return null;
}

/**
 * Batch ownership validation for list operations
 * @param {Array} resources - Resources to validate
 * @param {string} resourceType - Type of resources
 * @param {Object} user - Current user
 * @returns {{ valid: Array, invalid: Array }}
 */
export function batchValidateOwnership(resources, resourceType, user) {
  const valid = [];
  const invalid = [];
  
  for (const resource of resources) {
    if (isOwner(resource, resourceType, user)) {
      valid.push(resource);
    } else {
      invalid.push(resource);
    }
  }
  
  return { valid, invalid };
}

/**
 * Create a safe version of a resource (removes sensitive fields for non-owners)
 * @param {Object} resource - Resource to sanitize
 * @param {string} resourceType - Type of resource
 * @param {Object} user - Current user
 * @returns {Object}
 */
export function sanitizeResource(resource, resourceType, user) {
  if (!resource) return null;
  
  // Admins see everything
  if (user.role === 'admin' || user.role === 'superadmin') {
    return resource;
  }
  
  // Owner sees everything
  if (isOwner(resource, resourceType, user)) {
    return resource;
  }
  
  // Non-owners see limited data
  const publicFields = ['id', 'title', 'images', 'price', 'status', 'created_at'];
  const sanitized = {};
  
  for (const field of publicFields) {
    if (field in resource) {
      sanitized[field] = resource[field];
    }
  }
  
  return sanitized;
}

export default {
  OWNERSHIP_FIELDS,
  isOwner,
  requireOwnership,
  filterOwnedResources,
  canPerformAction,
  batchValidateOwnership,
  sanitizeResource,
};
