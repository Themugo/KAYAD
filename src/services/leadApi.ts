import { request, HttpRequestOptions } from "../api/httpRequest";

export interface MarketplaceOffer {
  id: string;
  lead_id: string;
  parent_offer_id: string | null;
  buyer_id: string;
  seller_id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  currency: "KES";
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "countered" | "expired";
  message?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface OfferActionInput {
  action: "accept" | "reject" | "counter" | "withdraw";
  amount?: number;
  message?: string;
  idempotencyKey: string;
}

export interface LeadListParams {
  stage?: string;
  source?: string;
  isHot?: boolean;
  vehicle?: string;
  archived?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

const apiRequest = async <T>(path: string, options?: HttpRequestOptions) => {
  const response = await request<T>(path, options);
  return (response as any)?.data ?? response;
};

const withParams = (path: string, params: Record<string, unknown> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
};

export const leadApi = {
  async list(params: LeadListParams = {}) {
    return apiRequest<{ leads: any[]; count: number; pagination: any }>(withParams("/api/leads", params as Record<string, unknown>), {
      method: "GET",
    });
  },
  async get(leadId: string) {
    return apiRequest<{ lead: any }>(`/api/leads/${leadId}`, { method: "GET" });
  },
  async updateStage(leadId: string, stage: string) {
    return apiRequest<{ lead: any }>(`/api/leads/${leadId}/stage`, {
      method: "PUT",
      body: { stage },
    });
  },
  async archive(leadId: string) {
    return apiRequest<{ lead: any }>(`/api/leads/${leadId}/archive`, { method: "PUT" });
  },
  async toggleHot(leadId: string) {
    return apiRequest<{ lead: any }>(`/api/leads/${leadId}/hot`, { method: "PUT" });
  },
  async addNote(leadId: string, note: string) {
    return apiRequest<{ lead: any }>(`/api/leads/${leadId}/notes`, { method: "POST", body: { note } });
  },
  async myNegotiations() {
    return apiRequest<{ leads: Array<{ id: string; vehicle?: string | null; dealer?: string | null; stage?: string; created_at?: string }> }>("/api/leads/mine/offers", { method: "GET" });
  },
  async offers(leadId: string) {
    return apiRequest<{ offers: MarketplaceOffer[]; events: any[] }>(`/api/leads/${leadId}/offers`, { method: "GET" });
  },
  async submitOffer(leadId: string, input: { amount: number; message?: string; idempotencyKey: string }) {
    return apiRequest<{ offer: MarketplaceOffer; replayed: boolean }>(`/api/leads/${leadId}/offers`, { method: "POST", body: input });
  },
  async respondToOffer(leadId: string, offerId: string, input: OfferActionInput) {
    return apiRequest<{ offer: MarketplaceOffer; replayed: boolean }>(`/api/leads/${leadId}/offers/${offerId}/actions`, { method: "POST", body: input });
  },
  async timeline(leadId: string) {
    return apiRequest<{ timeline: any[] }>(`/api/leads/${leadId}/timeline`, { method: "GET" });
  },
  async pipeline() {
    return apiRequest<{ pipeline: any[] }>("/api/leads/pipeline/view", { method: "GET" });
  },
  async analytics(params?: { startDate?: string; endDate?: string }) {
    return apiRequest<{ analytics: any }>(withParams("/api/leads/analytics/summary", params || {}), { method: "GET" });
  },
};

export default leadApi;
