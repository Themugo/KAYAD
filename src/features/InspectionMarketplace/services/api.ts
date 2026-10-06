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
  search?: string;
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
  providerId?: string;
  ratings: {
    overall: number;
    professionalism?: number;
    thoroughness?: number;
    timeliness?: number;
    communication?: number;
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



export interface InspectionBusinessCenterApi {
  getMe: () => Promise<{ provider: any }>;
  getDashboard: (providerId: string) => Promise<any>;
  getAttention: (providerId: string) => Promise<any>;
  getBookings: (providerId: string, params?: Record<string, unknown>) => Promise<any>;
  getBookingBoard: (providerId: string) => Promise<any>;
  updateBookingStatus: (providerId: string, bookingId: string, status: string, staffId?: string, notes?: string) => Promise<any>;
  getEngineers: (providerId: string, params?: Record<string, unknown>) => Promise<any>;
  createEngineer: (providerId: string, body: Record<string, unknown>) => Promise<any>;
  updateEngineer: (providerId: string, engineerId: string, body: Record<string, unknown>) => Promise<any>;
  setEngineerAvailability: (providerId: string, engineerId: string, isAvailable: boolean) => Promise<any>;
  getEngineerPerformance: (providerId: string, engineerId: string, period?: string) => Promise<any>;
  getReportQueue: (providerId: string, status?: string) => Promise<any>;
  submitReport: (providerId: string, reportId: string) => Promise<any>;
  approveReport: (providerId: string, reportId: string, notes?: string) => Promise<any>;
  requestCorrections: (providerId: string, reportId: string, corrections: any[]) => Promise<any>;
  sendReport: (providerId: string, reportId: string, method?: string) => Promise<any>;
  getAnalytics: (providerId: string, period?: string) => Promise<any>;
  getFinance: (providerId: string, period?: string) => Promise<any>;
  getTransactions: (providerId: string, params?: Record<string, unknown>) => Promise<any>;
  getSettlements: (providerId: string, status?: string) => Promise<any>;
  generateSettlement: (providerId: string, periodStart: string, periodEnd: string) => Promise<any>;
  getCustomers: (providerId: string, params?: Record<string, unknown>) => Promise<any>;
  getProfile: (providerId: string) => Promise<any>;
  updateProfile: (providerId: string, body: Record<string, unknown>) => Promise<any>;
  getPackages: (providerId: string, includeInactive?: boolean) => Promise<any>;
  createPackage: (providerId: string, body: Record<string, unknown>) => Promise<any>;
  updatePackage: (providerId: string, packageId: string, body: Record<string, unknown>) => Promise<any>;
  getBranches: (providerId: string) => Promise<any>;
  createBranch: (providerId: string, body: Record<string, unknown>) => Promise<any>;
  getCredentials: (providerId: string) => Promise<any>;
  createCredential: (providerId: string, body: Record<string, unknown>) => Promise<any>;
  getPromos: (providerId: string) => Promise<any>;
  createPromo: (providerId: string, body: Record<string, unknown>) => Promise<any>;
  getDocuments: (providerId: string) => Promise<any>;
  createDocument: (providerId: string, body: Record<string, unknown>) => Promise<any>;
}

export const inspectionBusinessCenterApi: InspectionBusinessCenterApi = {
  getMe: async () => unwrapInspectionResponse(await apiClient.get('/api/business-center/me')),
  getDashboard: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/dashboard`)),
  getAttention: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/attention`)),
  getBookings: async (id, params) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/bookings`, { params })),
  getBookingBoard: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/bookings/status`)),
  updateBookingStatus: async (id, bookingId, status, staffId, notes) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/bookings/${bookingId}/status`, { status, staffId, notes })),
  getEngineers: async (id, params) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/engineers`, { params })),
  createEngineer: async (id, body) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/engineers`, body)),
  updateEngineer: async (id, engineerId, body) => unwrapInspectionResponse(await apiClient.patch(`/api/business-center/${id}/engineers/${engineerId}`, body)),
  setEngineerAvailability: async (id, engineerId, isAvailable) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/engineers/${engineerId}/availability`, { isAvailable })),
  getEngineerPerformance: async (id, engineerId, period = 'monthly') => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/engineers/${engineerId}/performance`, { params: { period } })),
  getReportQueue: async (id, status) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/reports/queue`, { params: { status } })),
  submitReport: async (id, reportId) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/reports/${reportId}/submit`, {})),
  approveReport: async (id, reportId, notes) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/reports/${reportId}/approve`, { notes })),
  requestCorrections: async (id, reportId, corrections) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/reports/${reportId}/corrections`, { corrections })),
  sendReport: async (id, reportId, method = 'portal') => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/reports/${reportId}/send`, { method })),
  getAnalytics: async (id, period = 'monthly') => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/analytics`, { params: { period } })),
  getFinance: async (id, period = 'monthly') => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/finance/overview`, { params: { period } })),
  getTransactions: async (id, params) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/finance/transactions`, { params })),
  getSettlements: async (id, status) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/finance/settlements`, { params: { status } })),
  generateSettlement: async (id, periodStart, periodEnd) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/finance/settlements`, { periodStart, periodEnd })),
  getCustomers: async (id, params) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/customers`, { params })),
  getProfile: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/profile`)),
  updateProfile: async (id, body) => unwrapInspectionResponse(await apiClient.patch(`/api/business-center/${id}/profile`, body)),
  getPackages: async (id, includeInactive = true) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/packages`, { params: { includeInactive } })),
  createPackage: async (id, body) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/packages`, body)),
  updatePackage: async (id, packageId, body) => unwrapInspectionResponse(await apiClient.patch(`/api/business-center/${id}/packages/${packageId}`, body)),
  getBranches: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/branches`)),
  createBranch: async (id, body) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/branches`, body)),
  getCredentials: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/credentials`)),
  createCredential: async (id, body) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/credentials`, body)),
  getPromos: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/promos`)),
  createPromo: async (id, body) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/promos`, body)),
  getDocuments: async (id) => unwrapInspectionResponse(await apiClient.get(`/api/business-center/${id}/documents`)),
  createDocument: async (id, body) => unwrapInspectionResponse(await apiClient.post(`/api/business-center/${id}/documents`, body)),
};

export default inspectionApi;
