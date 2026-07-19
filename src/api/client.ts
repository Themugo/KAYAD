// src/api/client.ts
// ============================================================
// KAYAD API Client - Connects to backend REST API
// ============================================================

import axios from 'axios';

const BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('kayad:auth-expired'));
    }
    return Promise.reject(error);
  }
);

// Unwrap response data helper
const unwrap = <T>(res: { data: T }) => res.data;

// ============================================================
// Auth API
// ============================================================
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then(unwrap),
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    apiClient.post('/auth/register', data).then(unwrap),
  logout: () => apiClient.post('/auth/logout').then(unwrap),
  profile: () => apiClient.get('/auth/profile').then(unwrap),
  refresh: () => apiClient.post('/auth/refresh').then(unwrap),
};

// ============================================================
// Cars API
// ============================================================
export const carsAPI = {
  list: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    make?: string;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    type?: string;
    search?: string;
  }) => apiClient.get('/cars', { params }).then(unwrap),
  
  get: (id: string) => apiClient.get(`/cars/${id}`).then(unwrap),
  
  myCars: () => apiClient.get('/cars/dealer/my-cars').then(unwrap),
  
  create: (formData: FormData) =>
    apiClient.post('/cars', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap),
  
  update: (id: string, data: unknown) =>
    apiClient.put(`/cars/${id}`, data).then(unwrap),
  
  delete: (id: string) => apiClient.delete(`/cars/${id}`).then(unwrap),
};

// ============================================================
// Payments API
// ============================================================
export const paymentsAPI = {
  initiate: (data: { amount: number; carId: string }) =>
    apiClient.post('/payments/initiate', data, { timeout: 45000 }).then(unwrap),
  status: (id: string) => apiClient.get(`/payments/status/${id}`).then(unwrap),
  myPayments: () => apiClient.get('/payments/my').then(unwrap),
};

// ============================================================
// Escrow API
// ============================================================
export const escrowAPI = {
  stats: () => apiClient.get('/escrow/stats').then(unwrap),
  mine: () => apiClient.get('/escrow/my').then(unwrap),
  get: (id: string) => apiClient.get(`/escrow/${id}`).then(unwrap),
  release: (id: string) => apiClient.post(`/escrow/${id}/release`).then(unwrap),
  refund: (id: string) => apiClient.post(`/escrow/${id}/refund`).then(unwrap),
};

// ============================================================
// Bids API
// ============================================================
export const bidsAPI = {
  place: (carId: string, data: { amount: number }) =>
    apiClient.post(`/bids/${carId}/bid`, data).then(unwrap),
  getForCar: (carId: string) => apiClient.get(`/bids/${carId}/bids`).then(unwrap),
  myBids: () => apiClient.get('/bids/my').then(unwrap),
};

// ============================================================
// Favorites API
// ============================================================
export const favoritesAPI = {
  list: () => apiClient.get('/favorites').then(unwrap),
  toggle: (carId: string) => apiClient.post(`/favorites/toggle/${carId}`).then(unwrap),
};

// ============================================================
// Support API
// ============================================================
export const supportAPI = {
  create: (data: { subject: string; message: string }) =>
    apiClient.post('/support', data).then(unwrap),
  myTickets: () => apiClient.get('/support/my-tickets').then(unwrap),
};

// ============================================================
// Admin API
// ============================================================
export const adminAPI = {
  stats: () => apiClient.get('/admin/stats').then(unwrap),
  users: (params?: { page?: number; role?: string }) =>
    apiClient.get('/admin/users', { params }).then(unwrap),
  cars: (params?: { page?: number; status?: string }) =>
    apiClient.get('/admin/cars', { params }).then(unwrap),
};

export default apiClient;
