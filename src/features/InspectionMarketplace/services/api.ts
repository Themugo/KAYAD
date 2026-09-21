// ============================================================
// KAYAD INSPECTION MARKETPLACE - API SERVICE
// ============================================================

import { api as apiClient } from '../../../api/api';
const unwrapInspectionResponse = <T>(response: { data?: any }): T =>
  (response?.data?.data ?? response?.data) as T;

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

export interface InspectionPaymentInitiation {
  success?: boolean;
  paymentStatus?: string;
  checkoutRequestID?: string;
  checkoutID?: string;
  payment?: Record<string, unknown>;
  message?: string;
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
  /** Canonical Phase 22 provider application. */
  registerProvider: async (profile: Record<string, unknown>) => {
    const response = await apiClient.post('/api/v1/phase22/providers/register', profile);
    return unwrapInspectionResponse(response);
  },

  /** Canonical geospatial provider discovery. */
  findNearbyProviders: async (params: { lat: number; lon: number; serviceType?: string; radiusKm?: number }) => {
    const response = await apiClient.get('/api/v1/phase22/providers/nearby', { params });
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // PROVIDER ENDPOINTS
  // ============================================================

  /**
   * Search inspection providers
   */
  searchProviders: async (params: SearchProvidersParams): Promise<{ items: InspectionProvider[]; total: number }> => {
    const response = await apiClient.get<{ items: InspectionProvider[]; total: number }>(
      '/api/inspection/providers',
      { params }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider profile
   */
  getProviderProfile: async (providerId: string): Promise<InspectionProvider> => {
    const response = await apiClient.get<InspectionProvider>(
      `/api/inspection/providers/${providerId}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider reviews
   */
  getProviderReviews: async (providerId: string, limit = 20) => {
    const response = await apiClient.get<{ reviews: any[] }>(
      `/api/inspection/providers/${providerId}/reviews`,
      { params: { limit } }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get available time slots
   */
  getAvailableSlots: async (providerId: string, date: string, staffId?: string): Promise<{ slots: TimeSlot[]; date: string }> => {
    const response = await apiClient.get<{ slots: TimeSlot[]; date: string }>(
      `/api/inspection/providers/${providerId}/slots`,
      { params: { date, staffId } }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider dashboard
   */
  getProviderDashboard: async (providerId: string): Promise<ProviderDashboard> => {
    const response = await apiClient.get<ProviderDashboard>(
      `/api/inspection/provider/${providerId}/dashboard`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider earnings
   */
  getProviderEarnings: async (providerId: string, period = 'monthly'): Promise<EarningsSummary> => {
    const response = await apiClient.get<EarningsSummary>(
      `/api/inspection/provider/${providerId}/earnings-summary`,
      { params: { period } }
    );
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // BOOKING ENDPOINTS
  // ============================================================

  /**
   * Create a new booking
   */
  createBooking: async (params: CreateBookingParams): Promise<Booking> => {
    const response = await apiClient.post<Booking>('/api/inspection/bookings', params);
    return unwrapInspectionResponse(response);
  },

  /**
   * Initiate a real M-Pesa STK payment. The backend derives the amount from
   * the booking and the verified callback settles the canonical inspection
   * payment RPC; the browser never marks a booking paid by itself.
   */
  initiatePayment: async (bookingId: string, phone: string): Promise<InspectionPaymentInitiation> => {
    const response = await apiClient.post(`/api/inspection/bookings/${bookingId}/payment/initiate`, { phone });
    return unwrapInspectionResponse(response);
  },

  getPaymentStatus: async (paymentId: string) => {
    const response = await apiClient.get(`/api/payments/status/${paymentId}`);
    return unwrapInspectionResponse(response);
  },

  /**
   * Get canonical report entitlement/access state.
   */
  getReportAccess: async (reportId: string) => {
    const response = await apiClient.get(`/api/v1/phase22/reports/${reportId}/access`);
    return unwrapInspectionResponse(response);
  },

  /**
   * Purchase second-buyer report access using a real payment reference.
   */
  purchaseReport: async (reportId: string, paymentReference: string) => {
    const response = await apiClient.post(`/api/v1/phase22/reports/${reportId}/purchase`, { paymentReference });
    return unwrapInspectionResponse(response);
  },

  /**
   * Submit a review through the canonical atomic review RPC.
   */
  submitReviewAtomic: async (params: SubmitReviewParams) => {
    const response = await apiClient.post('/api/inspection/reviews', params);
    return unwrapInspectionResponse(response);
  },

  /**
   * Open/evidence an inspection dispute through the Phase 22 RPC boundary.
   */
  openDispute: async (bookingId: string, type: string, description: string) => {
    const response = await apiClient.post(`/api/v1/phase22/bookings/${bookingId}/disputes`, { type, description });
    return unwrapInspectionResponse(response);
  },

  addDisputeEvidence: async (disputeId: string, type: string, evidence: Record<string, unknown>) => {
    const response = await apiClient.post(`/api/v1/phase22/disputes/${disputeId}/evidence`, { type, evidence });
    return unwrapInspectionResponse(response);
  },

  /**
   * Get customer bookings
   */
  getCustomerBookings: async (params?: { status?: string; upcoming?: boolean }) => {
    const response = await apiClient.get<{ bookings: Booking[] }>(
      '/api/inspection/bookings',
      { params }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get booking by reference
   */
  getBooking: async (reference: string) => {
    const response = await apiClient.get<Booking>(
      `/api/inspection/bookings/${reference}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Cancel booking
   */
  cancelBooking: async (bookingId: string, reason: string) => {
    const response = await apiClient.post<{ booking: Booking; refundAmount: number }>(
      `/api/inspection/bookings/${bookingId}/cancel`,
      { reason }
    );
    return unwrapInspectionResponse(response);
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
  ): Promise<{
    items: Booking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get<{
      items: Booking[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/inspection/provider/${providerId}/bookings`, { params });
    return unwrapInspectionResponse<{
      items: Booking[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(response);
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
    return unwrapInspectionResponse(response);
  },

  /**
   * Assign inspector
   */
  assignInspector: async (providerId: string, bookingId: string, staffId: string) => {
    const response = await apiClient.post<Booking>(
      `/api/inspection/provider/${providerId}/bookings/${bookingId}/assign`,
      { staffId }
    );
    return unwrapInspectionResponse(response);
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
    return unwrapInspectionResponse(response);
  },

  /**
   * Get report by share token
   */
  getReportByShareToken: async (token: string) => {
    const response = await apiClient.get<InspectionReport>(
      `/api/inspection/reports/share/${token}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Generate PDF
   */
  generatePDF: async (providerId: string, reportId: string) => {
    const response = await apiClient.post<{ pdfUrl: string }>(
      `/api/inspection/provider/${providerId}/reports/${reportId}/pdf`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Share report
   */
  shareReport: async (providerId: string, reportId: string) => {
    const response = await apiClient.post<{ shareUrl: string; expiresAt: string }>(
      `/api/inspection/provider/${providerId}/reports/${reportId}/share`
    );
    return unwrapInspectionResponse(response);
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
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // REVIEW ENDPOINTS
  // ============================================================

  /**
   * Submit review
   */
  submitReview: async (params: SubmitReviewParams) => {
    const response = await apiClient.post('/api/inspection/reviews', params);
    return unwrapInspectionResponse(response);
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
    return unwrapInspectionResponse(response);
  },

  /**
   * Get settlements
   */
  getSettlements: async (providerId: string, status?: string) => {
    const response = await apiClient.get<{ settlements: any[] }>(
      `/api/inspection/provider/${providerId}/settlements`,
      { params: { status } }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Generate settlement
   */
  generateSettlement: async (providerId: string, periodStart: string, periodEnd: string) => {
    const response = await apiClient.post(
      `/api/inspection/provider/${providerId}/settlements`,
      { periodStart, periodEnd }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get earnings summary
   */
  getEarningsSummary: async (providerId: string, period = 'monthly') => {
    const response = await apiClient.get<EarningsSummary>(
      `/api/inspection/provider/${providerId}/earnings`,
      { params: { period } }
    );
    return unwrapInspectionResponse(response);
  },
};

export default inspectionApi;
