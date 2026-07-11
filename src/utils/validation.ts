/**
 * Form Validation Utility
 * Provides reusable validation functions and schema-based validation
 */

import type { ValidationSchema, ValidationRule } from '../types';

// ============================================================
// Validation Rules
// ============================================================

export const validators = {
  required: (_message = 'This field is required') => ({
    required: _message,
  }),

  email: (_message = 'Please enter a valid email') => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    email: true,
  }),

  phone: (_message = 'Please enter a valid phone number') => ({
    phone: true,
    pattern: /^(\+254|0)[17]\d{8}$/,
  }),

  minLength: (min: number, message?: string) => ({
    minLength: min,
    custom: (value: unknown) => {
      if (typeof value === 'string' && value.length < min) {
        return message || `Must be at least ${min} characters`;
      }
      return undefined;
    },
  }),

  maxLength: (max: number, message?: string) => ({
    maxLength: max,
    custom: (value: unknown) => {
      if (typeof value === 'string' && value.length > max) {
        return message || `Must be no more than ${max} characters`;
      }
      return undefined;
    },
  }),

  min: (min: number, message?: string) => ({
    min,
    custom: (value: unknown) => {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(num) && num < min) {
        return message || `Must be at least ${min}`;
      }
      return undefined;
    },
  }),

  max: (max: number, message?: string) => ({
    max,
    custom: (value: unknown) => {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(num) && num > max) {
        return message || `Must be no more than ${max}`;
      }
      return undefined;
    },
  }),

  pattern: (regex: RegExp, message = 'Invalid format') => ({
    pattern: regex,
    custom: (value: unknown) => {
      if (typeof value === 'string' && !regex.test(value)) {
        return message;
      }
      return undefined;
    },
  }),

  url: (_message = 'Please enter a valid URL') => ({
    pattern: /^https?:\/\/.+/,
    url: true,
  }),

  number: (message = 'Please enter a valid number') => ({
    custom: (value: unknown) => {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return message;
      return undefined;
    },
  }),

  positiveNumber: (message = 'Must be a positive number') => ({
    custom: (value: unknown) => {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num) || num <= 0) return message;
      return undefined;
    },
  }),

  year: (message = 'Please enter a valid year') => ({
    custom: (value: unknown) => {
      const year = typeof value === 'number' ? value : parseInt(String(value), 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        return message || `Year must be between 1900 and ${currentYear + 1}`;
      }
      return undefined;
    },
  }),

  price: (message = 'Please enter a valid price') => ({
    custom: (value: unknown) => {
      const price = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(price) || price <= 0) return message;
      if (price > 1000000000) return 'Price seems unreasonably high';
      return undefined;
    },
  }),

  mileage: (message = 'Please enter a valid mileage') => ({
    custom: (value: unknown) => {
      const mileage = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(mileage) || mileage < 0) return message;
      if (mileage > 1000000) return 'Mileage seems unreasonably high';
      return undefined;
    },
  }),
};

// ============================================================
// Validation Functions
// ============================================================

export function validate(value: unknown, rules: ValidationRule): string | undefined {
  // Required check
  if (rules.required !== undefined) {
    if (value === undefined || value === null || value === '') {
      return typeof rules.required === 'string' ? rules.required : 'This field is required';
    }
    if (Array.isArray(value) && value.length === 0) {
      return typeof rules.required === 'string' ? rules.required : 'This field is required';
    }
  }

  // Skip other validations if empty and not required
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const strValue = String(value);

  // Min length
  if (rules.minLength !== undefined && strValue.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  // Max length
  if (rules.maxLength !== undefined && strValue.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  // Min
  if (rules.min !== undefined) {
    const num = parseFloat(strValue);
    if (!isNaN(num) && num < rules.min) {
      return `Must be at least ${rules.min}`;
    }
  }

  // Max
  if (rules.max !== undefined) {
    const num = parseFloat(strValue);
    if (!isNaN(num) && num > rules.max) {
      return `Must be no more than ${rules.max}`;
    }
  }

  // Pattern
  if (rules.pattern !== undefined && !rules.pattern.test(strValue)) {
    return 'Invalid format';
  }

  // Email
  if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strValue)) {
      return 'Please enter a valid email address';
    }
  }

  // Phone
  if (rules.phone) {
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(strValue.replace(/\s/g, ''))) {
      return 'Please enter a valid Kenyan phone number';
    }
  }

  // URL
  if (rules.url) {
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(strValue)) {
      return 'Please enter a valid URL';
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return undefined;
}

export function validateSchema(
  values: Record<string, unknown>,
  schema: ValidationSchema
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const error = validate(values[field], rules);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}

export function validateField(
  value: unknown,
  rules: ValidationRule
): { valid: boolean; error?: string } {
  const error = validate(value, rules);
  return {
    valid: !error,
    error,
  };
}

// ============================================================
// Form Validation Schemas
// ============================================================

export const schemas = {
  login: {
    email: { ...validators.required(), ...validators.email() },
    password: { ...validators.required(), ...validators.minLength(6) },
  } as ValidationSchema,

  register: {
    email: { ...validators.required(), ...validators.email() },
    password: { ...validators.required(), ...validators.minLength(8) },
    name: { ...validators.required(), ...validators.minLength(2) },
  } as ValidationSchema,

  dealerRegister: {
    email: { ...validators.required(), ...validators.email() },
    password: { ...validators.required(), ...validators.minLength(8) },
    name: { ...validators.required(), ...validators.minLength(2) },
    businessName: { ...validators.required(), ...validators.minLength(2) },
    phone: { ...validators.required(), ...validators.phone() },
  } as ValidationSchema,

  addCar: {
    title: { ...validators.required(), ...validators.minLength(5), ...validators.maxLength(100) },
    brand: { ...validators.required() },
    model: { ...validators.required() },
    year: { ...validators.required(), ...validators.year() },
    price: { ...validators.required(), ...validators.price() },
    mileage: { ...validators.required(), ...validators.mileage() },
    fuel: { ...validators.required() },
    transmission: { ...validators.required() },
    bodyType: { ...validators.required() },
    description: { ...validators.minLength(20) },
    locationCity: { ...validators.required() },
  } as ValidationSchema,

  bid: {
    amount: { ...validators.required(), ...validators.positiveNumber() },
  } as ValidationSchema,

  payment: {
    amount: { ...validators.required(), ...validators.positiveNumber() },
    method: { ...validators.required() },
  } as ValidationSchema,

  contact: {
    name: { ...validators.required(), ...validators.minLength(2) },
    email: { ...validators.required(), ...validators.email() },
    message: { ...validators.required(), ...validators.minLength(10) },
  } as ValidationSchema,
};

// ============================================================
// Utility Functions
// ============================================================

export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

export function getErrorCount(errors: Record<string, string>): number {
  return Object.keys(errors).length;
}

export function clearFieldError(
  errors: Record<string, string>,
  field: string
): Record<string, string> {
  const { [field]: _, ...rest } = errors;
  return rest;
}

export function mergeErrors(
  existingErrors: Record<string, string>,
  newErrors: Record<string, string>
): Record<string, string> {
  return { ...existingErrors, ...newErrors };
}
