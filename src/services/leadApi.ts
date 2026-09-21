import { request, HttpRequestOptions } from "../api/httpRequest";

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
