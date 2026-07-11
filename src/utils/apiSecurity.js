// ============================================================
// SECURE API CLIENT
// Wraps API calls with security best practices
// ============================================================

import { supabase } from '../lib/supabaseClient';
import { 
  sanitizeQueryObject, 
  validateAPIResponse, 
  logSecurityEvent, 
  SecurityEvents,
  validateFile,
  UPLOAD_LIMITS
} from './security';
import { isOwner, requireOwnership } from './ownership';

// ─── SECURE API CLIENT ────────────────────────────────────────

class SecureAPIClient {
  constructor() {
    this.baseTimeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  /**
   * Make a secure authenticated request
   */
  async request(endpoint, options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || this.baseTimeout);

    try {
      // Sanitize query parameters
      if (options.params) {
        options.params = sanitizeQueryObject(options.params);
      }

      const response = await fetch(endpoint, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      const validation = validateAPIResponse(response);
      if (!validation.valid) {
        if (response.status === 403) {
          logSecurityEvent(SecurityEvents.PERMISSION_DENIED, { endpoint });
        }
        throw { response: { status: response.status, data: { message: 'Request failed' } } };
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        throw { response: { status: 408, data: { message: 'Request timeout' } } };
      }
      
      throw error;
    }
  }

  /**
   * Secure file upload with validation
   */
  async uploadFile(endpoint, file, type = 'image', additionalData = {}) {
    // Validate file
    const validation = validateFile(file, type);
    if (!validation.valid) {
      logSecurityEvent(SecurityEvents.INVALID_FILE, { 
        filename: file.name, 
        error: validation.error 
      });
      throw { response: { status: 400, data: { message: validation.error } } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Add CSRF token
    const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    if (csrfToken) {
      formData.append('_csrf', csrfToken);
    }

    // Add additional data
    for (const [key, value] of Object.entries(additionalData)) {
      formData.append(key, value);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: formData,
    });

    const validation2 = validateAPIResponse(response);
    if (!validation2.valid) {
      throw { response: { status: response.status, data: { message: 'Upload failed' } } };
    }

    return await response.json();
  }

  /**
   * Validate ownership before making request
   */
  async requestWithOwnership(resource, resourceType, action = 'read') {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    }

    // Admins bypass ownership check
    if (user.role === 'admin' || user.role === 'superadmin') {
      return true;
    }

    // Validate ownership
    if (!isOwner(resource, resourceType, user)) {
      logSecurityEvent(SecurityEvents.PERMISSION_DENIED, { 
        resourceType, 
        action,
        userId: user.id 
      });
      throw { response: { status: 403, data: { message: 'Access denied' } } };
    }

    return true;
  }
}

export const secureAPI = new SecureAPIClient();

// ─── SECURE RESOURCE HOOKS ────────────────────────────────────

/**
 * Hook for secure resource access
 */
export function useSecureResource(resource, resourceType) {
  const { data: { user } } = supabase.auth.getUser();
  
  return {
    canRead: user?.role === 'admin' || user?.role === 'superadmin' || isOwner(resource, resourceType, user),
    canUpdate: user?.role === 'admin' || isOwner(resource, resourceType, user),
    canDelete: user?.role === 'superadmin' || isOwner(resource, resourceType, user),
    isOwner: isOwner(resource, resourceType, user),
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
  };
}

/**
 * Validate form data against schema
 */
export function validateFormData(data, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Required check
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = rules.requiredMessage || `${field} is required`;
      continue;
    }
    
    if (!value) continue; // Optional field, skip other checks
    
    // Type check
    if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field] = 'Invalid email format';
    }
    
    // Min length
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `Minimum ${rules.minLength} characters required`;
    }
    
    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `Maximum ${rules.maxLength} characters allowed`;
    }
    
    // Pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || 'Invalid format';
    }
    
    // Min value
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      errors[field] = `Minimum value is ${rules.min}`;
    }
    
    // Max value
    if (rules.max !== undefined && parseFloat(value) > rules.max) {
      errors[field] = `Maximum value is ${rules.max}`;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ─── FORM VALIDATION SCHEMAS ─────────────────────────────────

export const FORM_SCHEMAS = {
  login: {
    email: { required: true, type: 'email', maxLength: 255 },
    password: { required: true, minLength: 6 },
  },
  register: {
    email: { required: true, type: 'email', maxLength: 255 },
    password: { required: true, minLength: 8 },
    name: { required: true, minLength: 2, maxLength: 100 },
    phone: { required: false, pattern: /^(\+254|254|0)[17][0-9]{8}$/ },
  },
  dealerRegistration: {
    email: { required: true, type: 'email', maxLength: 255 },
    password: { required: true, minLength: 8 },
    name: { required: true, minLength: 2, maxLength: 100 },
    phone: { required: true, pattern: /^(\+254|254|0)[17][0-9]{8}$/ },
    business_name: { required: true, minLength: 2, maxLength: 200 },
    location: { required: true },
  },
  carListing: {
    title: { required: true, minLength: 3, maxLength: 200 },
    brand: { required: true },
    price: { required: true, min: 1, max: 100000000000 },
    year: { required: true, min: 1900, max: new Date().getFullYear() + 1 },
    description: { required: true, minLength: 10, maxLength: 2000 },
  },
  review: {
    rating: { required: true, min: 1, max: 5 },
    comment: { required: true, minLength: 10, maxLength: 1000 },
  },
  inquiry: {
    message: { required: true, minLength: 10, maxLength: 2000 },
  },
};

export default {
  secureAPI,
  useSecureResource,
  validateFormData,
  FORM_SCHEMAS,
};
