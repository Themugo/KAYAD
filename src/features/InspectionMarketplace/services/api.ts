// ============================================================
// KAYAD INSPECTION MARKETPLACE - API SERVICE
// ============================================================

import { apiClient } from '@/lib/api-client-react';
import type {
  InspectionProvider,
  InspectionPackage,
  Booking,
  InspectionReport,
  TimeSlot,
  ProviderDashboard,
  EarningsSummary,
  InspectionType,
} from '../types/inspection';

export interface SearchProvidersParams {
  country?: string;
  county?: string;
  town?: string;
  inspectionType?: InspectionType;
  vehicleTypes?: string[];
  mobileOnly?: boolean;
  workshopOnly?: boolean;
  sameDayAvailable?: boolean;
  weekendAvailable?: boolean;
  commercialVehicles?: boolean;
  electricVehicles?: boolean;
  luxuryVehicles?: boolean;
  minRating?: number;
  sortBy?: 'rating' | 'reviews' | 'price_low' | 'price_high' | 'completions';
  page?: number;
  limit?: number;
}

export interface CreateBookingParams {
  packageId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleRegistration?: string;
  vehicleVin?: string;
  vehicleType?: string;
  county?: string;
  town?: string;
  inspectionAddress?: string;
  latitude?: number;
  longitude?: number;
  isMobile?: boolean;
  sellerName?: string;
  sellerPhone?: string;
  sellerIsDealer?: boolean;
  scheduledDate: string;
  scheduledTime: string;
  staffId?: string;
  notes?: string;
  discount?: number;
}

export interface SubmitReviewParams {
  bookingId: string;
  providerId: string;
  ratings: {
    overall: number;
    professionalism: number;
    thoroughness: number;
    timeliness: number;
    communication: number;
  };
  reviewText?: string;
}

/**
 * Inspection Marketplace API
 */
export const inspectionApi = {
  // ============================================================
  // PROVIDER ENDPOINTS
  // ============================================================

  /**
   * Search inspection providers
   */
  searchProviders: async (params: SearchProvidersParams) => {
    const response = await apiClient.get<{ items: InspectionProvider[]; total: number }>(
      '/api/inspection/providers',
      { params }
    );
    return response.data;
  },

  /**
   * Get provider profile
   */
  getProviderProfile: async (providerId: string) => {
    const response = await apiClient.get<InspectionProvider>(
      `/api/inspection/providers/${providerId}`
    );
    return response.data;
  },

  /**
   * Get provider reviews
   */
  getProviderReviews: async (providerId: string, limit = 20) => {
    const response = await apiClient.get<{ reviews: any[] }>(
      `/api/inspection/providers/${providerId}/reviews`,
      { params: { limit } }
    );
    return response.data;
  },

  /**
   * Get available time slots
   */
  getAvailableSlots: async (providerId: string, date: string, staffId?: string) => {
    const response = await apiClient.get<{ slots: TimeSlot[]; date: string }>(
      `/api/inspection/providers/${providerId}/slots`,
      { params: { date, staffId } }
    );
    return response.data;
  },

  /**
   * Get provider dashboard
   */
  getProviderDashboard: async (providerId: string) => {
    const response = await apiClient.get<ProviderDashboard>(
      `/api/inspection/provider/${providerId}/dashboard`
    );
    return response.data;
  },

  /**
   * Get provider earnings
   */
  getProviderEarnings: async (providerId: string, period = 'monthly') => {
    const response = await apiClient.get<EarningsSummary>(
      `/api/inspection/provider/${providerId}/earnings-summary`,
      { params: { period } }
    );
    return response.data;
  },

  // ============================================================
  // BOOKING ENDPOINTS
  // ============================================================

  /**
   * Create a new booking
   */
  createBooking: async (params: CreateBookingParams) => {
    const response = await apiClient.post<Booking>('/api/inspection/bookings', params);
    return response.data;
  },

  /**
   * Get customer bookings
   */
  getCustomerBookings: async (params?: { status?: string; upcoming?: boolean }) => {
    const response = await apiClient.get<{ bookings: Booking[] }>(
      '/api/inspection/bookings',
      { params }
    );
    return response.data;
  },

  /**
   * Get booking by reference
   */
  getBooking: async (reference: string) => {
    const response = await apiClient.get<Booking>(
      `/api/inspection/bookings/${reference}`
    );
    return response.data;
  },

  /**
   * Cancel booking
   */
  cancelBooking: async (bookingId: string, reason: string) => {
    const response = await apiClient.post<{ booking: Booking; refundAmount: number }>(
      `/api/inspection/bookings/${bookingId}/cancel`,
      { reason }
    );
    return response.data;
  },

  /**
   * Get provider bookings
   */
  getProviderBookings: async (
    providerId: string,
    params?: {
      status?: string;
      date?: string;
      fromDate?: string;
      toDate?: string;
      staffId?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    const response = await apiClient.get<{
      items: Booking[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/inspection/provider/${providerId}/bookings`, { params });
    return response.data;
  },

  /**
   * Update booking status
   */
  updateBookingStatus: async (
    providerId: string,
    bookingId: string,
    status: string,
    staffId?: string,
    notes?: string
  ) => {
    const response = await apiClient.post<Booking>(
      `/api/inspection/provider/${providerId}/bookings/${bookingId}/status`,
      { status, staffId, notes }
    );
    return response.data;
  },

  /**
   * Assign inspector
   */
  assignInspector: async (providerId: string, bookingId: string, staffId: string) => {
    const response = await apiClient.post<Booking>(
      `/api/inspection/provider/${providerId}/bookings/${bookingId}/assign`,
      { staffId }
    );
    return response.data;
  },

  // ============================================================
  // REPORT ENDPOINTS
  // ============================================================

  /**
   * Get report
   */
  getReport: async (reportId: string) => {
    const response = await apiClient.get<InspectionReport>(
      `/api/inspection/reports/${reportId}`
    );
    return response.data;
  },

  /**
   * Get report by share token
   */
  getReportByShareToken: async (token: string) => {
    const response = await apiClient.get<InspectionReport>(
      `/api/inspection/reports/share/${token}`
    );
    return response.data;
  },

  /**
   * Generate PDF
   */
  generatePDF: async (providerId: string, reportId: string) => {
    const response = await apiClient.post<{ pdfUrl: string }>(
      `/api/inspection/provider/${providerId}/reports/${reportId}/pdf`
    );
    return response.data;
  },

  /**
   * Share report
   */
  shareReport: async (providerId: string, reportId: string) => {
    const response = await apiClient.post<{ shareUrl: string; expiresAt: string }>(
      `/api/inspection/provider/${providerId}/reports/${reportId}/share`
    );
    return response.data;
  },

  /**
   * Revoke report share
   */
  revokeReportShare: async (providerId: string, reportId: string) => {
    await apiClient.delete(
      `/api/inspection/provider/${providerId}/reports/${reportId}/share`
    );
  },

  /**
   * Get inspection categories
   */
  getInspectionCategories: async () => {
    const response = await apiClient.get<{ categories: any }>(
      '/api/inspection/categories'
    );
    return response.data;
  },

  // ============================================================
  // REVIEW ENDPOINTS
  // ============================================================

  /**
   * Submit review
   */
  submitReview: async (params: SubmitReviewParams) => {
    const response = await apiClient.post('/api/inspection/reviews', params);
    return response.data;
  },

  // ============================================================
  // PAYMENT ENDPOINTS
  // ============================================================

  /**
   * Get transactions
   */
  getTransactions: async (
    providerId: string,
    params?: {
      type?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    const response = await apiClient.get<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/inspection/provider/${providerId}/transactions`, { params });
    return response.data;
  },

  /**
   * Get settlements
   */
  getSettlements: async (providerId: string, status?: string) => {
    const response = await apiClient.get<{ settlements: any[] }>(
      `/api/inspection/provider/${providerId}/settlements`,
      { params: { status } }
    );
    return response.data;
  },

  /**
   * Generate settlement
   */
  generateSettlement: async (providerId: string, periodStart: string, periodEnd: string) => {
    const response = await apiClient.post(
      `/api/inspection/provider/${providerId}/settlements`,
      { periodStart, periodEnd }
    );
    return response.data;
  },

  /**
   * Get earnings summary
   */
  getEarningsSummary: async (providerId: string, period = 'monthly') => {
    const response = await apiClient.get<EarningsSummary>(
      `/api/inspection/provider/${providerId}/earnings`,
      { params: { period } }
    );
    return response.data;
  },
};

export default inspectionApi;
