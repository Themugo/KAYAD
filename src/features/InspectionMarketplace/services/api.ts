// ============================================================
// KAYAD INSPECTION MARKETPLACE - API SERVICE
// ============================================================

import type { AxiosRequestConfig } from 'axios';
import { api as http } from '../../../api/api';

/**
 * The shared transport already carries the canonical `/api` prefix in its baseURL, so a path written
 * as `/api/inspection/...` would be sent to `/api/api/inspection/...` and 404. This file's paths are
 * written with the full `/api/...` route for readability, so strip that one leading prefix exactly once
 * (the same rule httpRequest.ts applies for every other service module).
 */
export const stripApiPrefix = (url: string): string => (/^\/api(?:\/|$)/.test(url) ? url.slice(4) || '/' : url);

const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => http.get<T>(stripApiPrefix(url), config),
  post: <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) => http.post<T>(stripApiPrefix(url), data, config),
  put: <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) => http.put<T>(stripApiPrefix(url), data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => http.delete<T>(stripApiPrefix(url), config),
};
const unwrapInspectionResponse = <T>(response: { data?: any }): T =>
  (response?.data?.data ?? response?.data) as T;

import type {
  ServiceTaxonomy,
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
  // Canonical taxonomy filters (validated again by the server).
  category?: string;
  subcategory?: string;
  make?: string;
  powertrain?: string;
  /** The vehicle is somewhere else and the provider must come to it (roadside / mobile). */
  atVehicleLocation?: boolean;
  /** Only providers whose matching capability has been verified by KAYAD. */
  verifiedOnly?: boolean;
  /** A point the customer chose to share. Used only to compute straight-line distance. */
  nearLat?: number;
  nearLng?: number;
  withinServiceRadius?: boolean;
  maxDistanceKm?: number;
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
    return unwrapInspectionResponse<{ bookings: Booking[] }>(response);
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
    return unwrapInspectionResponse<InspectionReport>(response);
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


// ============================================================
// AUTOMOTIVE SERVICES: taxonomy, capabilities, affiliations, governance
// ============================================================

export interface DeclareCapabilityInput {
  category: string;
  subcategory?: string | null;
  vehicleMakes?: string[];
  allMakes?: boolean;
  powertrains?: string[];
  staffId?: string | null;
  evidenceCredentialId?: string | null;
  travelsToCustomer?: boolean;
}

export const automotiveApi = {
  /** The one canonical expertise taxonomy (also used by registration, admin and matching). */
  getServiceTaxonomy: async (): Promise<ServiceTaxonomy> => {
    const response = await apiClient.get('/api/inspection/service-taxonomy');
    return unwrapInspectionResponse<ServiceTaxonomy>(response);
  },

  /** Canonical vehicle master data (makes). Reused, not duplicated. */
  getVehicleMakes: async (): Promise<string[]> => {
    const response = await apiClient.get('/api/config/vehicle/makes');
    const rows = (response?.data?.data ?? response?.data ?? []) as Array<{ value?: string; name?: string } | string>;
    return (Array.isArray(rows) ? rows : [])
      .map((r) => (typeof r === 'string' ? r : r.value || r.name || ''))
      .filter(Boolean);
  },

  /** The signed-in user's own business application, or null. */
  getMyProvider: async () =>
    unwrapInspectionResponse<{ provider: null | { id: string; company_name: string; trading_name?: string; lifecycle_stage: string; verification_route?: string | null; rejection_reason?: string | null; info_requested?: string | null; suspended_reason?: string | null; registration_number?: string | null; has_workshop?: boolean; address?: string | null } }>(await apiClient.get('/api/inspection/provider-me')),
  updateProviderProfile: async (providerId: string, patch: Record<string, unknown>) =>
    unwrapInspectionResponse<any>(await apiClient.put(`/api/inspection/provider/${providerId}`, patch)),
  addCredential: async (providerId: string, input: { type: string; name: string; issuingBody?: string; certificateNumber?: string; expiryDate?: string; documentUrl?: string }) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/provider/${providerId}/credentials`, input)),
  /** Evidence upload through the existing private "documents" upload endpoint. */
  uploadEvidence: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'documents');
    const response = await apiClient.post('/api/upload', form);
    const url = (response as any)?.data?.url;
    if (!url) throw new Error('The upload did not return a file location.');
    return String(url);
  },

  // ---- business (provider owner) ----
  listCapabilities: async (providerId: string) =>
    unwrapInspectionResponse<{ capabilities: any[] }>(await apiClient.get(`/api/inspection/provider/${providerId}/capabilities`)),
  declareCapability: async (providerId: string, input: DeclareCapabilityInput) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/provider/${providerId}/capabilities`, input)),
  listStaff: async (providerId: string) =>
    unwrapInspectionResponse<{ staff: any[] }>(await apiClient.get(`/api/inspection/provider/${providerId}/staff`)),
  inviteStaff: async (providerId: string, email: string, role?: string) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/provider/${providerId}/staff`, { email, role })),
  confirmStaff: async (providerId: string, staffId: string) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/provider/${providerId}/staff/${staffId}/confirm`, {})),
  endStaff: async (providerId: string, staffId: string) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/provider/${providerId}/staff/${staffId}/end`, {})),

  // ---- the individual ----
  myAffiliations: async () =>
    unwrapInspectionResponse<{ affiliations: any[] }>(await apiClient.get('/api/inspection/affiliations/my')),
  requestAffiliation: async (providerId: string, role?: string) =>
    unwrapInspectionResponse<any>(await apiClient.post('/api/inspection/affiliations', { providerId, role })),
  acceptAffiliation: async (staffId: string) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/affiliations/${staffId}/accept`, {})),
  leaveAffiliation: async (staffId: string) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/inspection/affiliations/${staffId}/leave`, {})),
};

/** Admin governance of the single provider network (existing admin control plane; audited server-side). */
export const providerGovernanceApi = {
  list: async (params: { stage?: string; page?: number; limit?: number } = {}) =>
    unwrapInspectionResponse<{ items: any[]; total: number; page: number }>(await apiClient.get('/api/admin/inspection-governance/providers', { params })),
  get: async (id: string) =>
    unwrapInspectionResponse<any>(await apiClient.get(`/api/admin/inspection-governance/providers/${id}`)),
  decideProvider: async (id: string, body: { decision: string; route?: string; notes?: string; reason?: string }) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/admin/inspection-governance/providers/${id}/decision`, body)),
  decideCredential: async (id: string, body: { decision: 'verify' | 'reject'; notes?: string }) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/admin/inspection-governance/credentials/${id}/decision`, body)),
  decideCapability: async (id: string, body: { decision: 'verify' | 'revoke'; notes?: string }) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/admin/inspection-governance/capabilities/${id}/decision`, body)),
  endStaff: async (id: string) =>
    unwrapInspectionResponse<any>(await apiClient.post(`/api/admin/inspection-governance/staff/${id}/end`, {})),
};
