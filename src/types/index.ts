/**
 * KAYAD Type Definitions
 * Central location for all shared TypeScript types
 */

// ============================================================
// Common Types
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
  code?: string;
}

// ============================================================
// User & Auth Types
// ============================================================

export interface User {
  _id?: string;
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'user' | 'dealer' | 'admin' | 'inspector' | 'support';
  avatar?: string;
  location?: string;
  approved?: boolean;
  businessName?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// ============================================================
// Car Types
// ============================================================

export interface CarImage {
  url: string;
  alt?: string;
}

export interface CarLocation {
  city: string;
  area?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Car {
  _id?: string;
  id?: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  transmission: 'Automatic' | 'Manual';
  bodyType: string;
  color?: string;
  description?: string;
  features?: string[];
  images?: CarImage[];
  location?: CarLocation;
  dealer?: {
    _id?: string;
    id?: string;
    name?: string;
    avatar?: string;
  };
  owner?: {
    _id?: string;
    id?: string;
    name?: string;
  };
  isAuction?: boolean;
  isLive?: boolean;
  auctionEnd?: string;
  currentBid?: number;
  totalBids?: number;
  isFeatured?: boolean;
  isPromoted?: boolean;
  hasInspection?: boolean;
  hasEscrow?: boolean;
  vin?: string;
  logbook?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CarFilters {
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  location?: string;
  isAuction?: boolean;
  isFeatured?: boolean;
}

// ============================================================
// Form Types
// ============================================================

export interface FormField {
  name: string;
  value: unknown;
  error?: string;
  touched?: boolean;
}

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export type ValidationRule = {
  required?: boolean | string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  custom?: (value: unknown) => string | undefined;
};

export type ValidationSchema = Record<string, ValidationRule>;

// ============================================================
// Toast Types
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'dealer';
  phone?: string;
  location?: string;
  businessName?: string;
}

export interface CreateCarRequest {
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  bodyType: string;
  color?: string;
  description?: string;
  features?: string[];
  locationCity?: string;
  locationArea?: string;
}

export interface BidRequest {
  amount: number;
  carId: string;
}

export interface PaymentRequest {
  amount: number;
  carId: string;
  method: 'mpesa' | 'card' | 'bank';
}
