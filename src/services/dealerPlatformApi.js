import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const dealerPlatformApi = axios.create({
  baseURL: `${API_URL}/dealer-platform`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const authHeaders = () => {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

dealerPlatformApi.interceptors.request.use((config) => {
  config.headers = { ...config.headers, ...authHeaders() };
  return config;
});

export const getDealerDashboard = () => dealerPlatformApi.get('/dashboard');
export const getDealerProfile = (dealerId) => dealerPlatformApi.get(`/profile/${dealerId}`);
export const updateDealerProfile = (dealerId, body) => dealerPlatformApi.put(`/profile/${dealerId}`, body);

export const getInventory = (params = {}) => dealerPlatformApi.get('/inventory', { params });
export const createListing = (body) => dealerPlatformApi.post('/inventory', body);
export const updateListing = (listingId, body) => dealerPlatformApi.put(`/inventory/${listingId}`, body);
export const deleteListing = (listingId) => dealerPlatformApi.delete(`/inventory/${listingId}`);
export const bulkUpdateListings = (body) => dealerPlatformApi.post('/inventory/bulk', body);

export const getLeads = (params = {}) => dealerPlatformApi.get('/leads', { params });
export const updateLead = (leadId, body) => dealerPlatformApi.put(`/leads/${leadId}`, body);
export const addLeadNote = (leadId, body) => dealerPlatformApi.post(`/leads/${leadId}/notes`, body);
export const createTask = (leadId, body) => dealerPlatformApi.post(`/leads/${leadId}/tasks`, body);
export const getSalesPipeline = () => dealerPlatformApi.get('/pipeline');

export const getMarketingCampaigns = (params = {}) => dealerPlatformApi.get('/marketing', { params });
export const createCampaign = (body) => dealerPlatformApi.post('/marketing', body);

export const getDealerAnalytics = (params = {}) => dealerPlatformApi.get('/analytics', { params });
export const getAIRecommendations = () => dealerPlatformApi.get('/analytics/recommendations');

export const getTeamMembers = () => dealerPlatformApi.get('/team');
export const inviteTeamMember = (body) => dealerPlatformApi.post('/team/invite', body);
export const updateTeamMember = (memberId, body) => dealerPlatformApi.put(`/team/${memberId}`, body);
export const getSubscription = () => dealerPlatformApi.get('/subscription');
export const askDealerCopilot = (body) => dealerPlatformApi.post('/copilot', body);

export const getCustomers = (params = {}) => dealerPlatformApi.get('/customers', { params });
export const getCustomerTimeline = (customerId) => dealerPlatformApi.get(`/customers/${customerId}/timeline`);
export const getAuctionInventory = (params = {}) => dealerPlatformApi.get('/auctions', { params });
export const getFinanceApplications = (params = {}) => dealerPlatformApi.get('/finance', { params });
export const getInspectionOrders = (params = {}) => dealerPlatformApi.get('/inspections', { params });
export const getReputation = () => dealerPlatformApi.get('/reputation');

export default dealerPlatformApi;
