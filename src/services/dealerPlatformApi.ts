import { request } from "../api/httpRequest";

type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  message?: string;
};

type DealerDashboard = {
  overview?: {
    totalListings?: number;
    activeListings?: number;
    totalViews?: number;
    leads?: Record<string, number>;
    revenue?: { total?: number };
  };
  topPerformers?: { vehicles?: unknown[] };
};

type DealerLeads = {
  items: any[];
  pagination?: { page?: number; limit?: number; total?: number; pages?: number };
  stats?: Record<string, number>;
};

type DealerCustomers = {
  items: any[];
  [key: string]: unknown;
};

export const getDealerDashboard = () =>
  request<ApiEnvelope<DealerDashboard>>("/dealer-platform/dashboard");

export const getLeads = (params: Record<string, unknown> = {}) =>
  request<ApiEnvelope<DealerLeads>>("/dealer-platform/leads", { params });

export const updateLead = (leadId: string, body: Record<string, unknown>) =>
  request<ApiEnvelope<Record<string, any>>>(`/dealer-platform/leads/${leadId}`, {
    method: "PUT",
    body,
  });

export const getCustomers = () =>
  request<ApiEnvelope<DealerCustomers>>("/dealer-platform/customers");

export const getMarketingCampaigns = () =>
  request<ApiEnvelope<{ items: any[]; stats?: Record<string, unknown>; [key: string]: unknown }>>(
    "/dealer-platform/marketing",
  );

export const createCampaign = (body: Record<string, unknown>) =>
  request<ApiEnvelope<Record<string, any>>>("/dealer-platform/marketing", {
    method: "POST",
    body,
  });

export const getAuctionInventory = () =>
  request<ApiEnvelope<unknown>>("/dealer-platform/auctions");

export const getFinanceApplications = () =>
  request<ApiEnvelope<unknown>>("/dealer-platform/finance");

export const getInspectionOrders = () =>
  request<ApiEnvelope<unknown>>("/dealer-platform/inspections");

export const getTeamMembers = () =>
  request<ApiEnvelope<unknown>>("/dealer-platform/team");

export const getDealerAnalytics = () =>
  request<ApiEnvelope<unknown>>("/dealer-platform/analytics");

export const getDealerProfile = (dealerId: string) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/profile/${dealerId}`);

export const updateDealerProfile = (dealerId: string, body: Record<string, unknown>) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/profile/${dealerId}`, {
    method: "PUT",
    body,
  });

export const getReputation = () =>
  request<ApiEnvelope<unknown>>("/dealer-platform/reputation");

export const updateCampaign = (campaignId: string, body: Record<string, unknown>) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/marketing/${campaignId}`, {
    method: "PUT",
    body,
  });

export const getLeadActivities = (leadId: string) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/leads/${leadId}/activities`);

export const addLeadNote = (leadId: string, note: string) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/leads/${leadId}/notes`, {
    method: "POST",
    body: { note },
  });

export const createLeadTask = (leadId: string, body: Record<string, unknown>) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/leads/${leadId}/tasks`, {
    method: "POST",
    body,
  });

export const inviteTeamMember = (body: Record<string, unknown>) =>
  request<ApiEnvelope<unknown>>("/dealer-platform/team/invite", {
    method: "POST",
    body,
  });

export const updateTeamMember = (memberId: string, body: Record<string, unknown>) =>
  request<ApiEnvelope<unknown>>(`/dealer-platform/team/${memberId}`, {
    method: "PUT",
    body,
  });

export const acceptTeamInvite = (token: string) =>
  request<ApiEnvelope<unknown>>("/dealer-platform/team/accept", {
    method: "POST",
    body: { token },
  });
