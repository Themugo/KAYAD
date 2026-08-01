import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const dealerPlatformApi = axios.create({
  baseURL: `${API_URL}/dealer-platform`,
  headers: {
    'Content-Type': 'application/json',
  },
});

dealerPlatformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard
export const getDealerDashboard = () => dealerPlatformApi.get('/dashboard');

// Profile
export const getDealerProfile = (dealerId) => dealerPlatformApi.get(`/profile/${dealerId}`);
export const updateDealerProfile = (dealerId, data) => dealerPlatformApi.put(`/profile/${dealerId}`, data);

// Inventory
export const getInventory = (params) => dealerPlatformApi.get('/inventory', { params });
export const createListing = (data) => dealerPlatformApi.post('/inventory', data);
export const updateListing = (listingId, data) => dealerPlatformApi.put(`/inventory/${listingId}`, data);
export const deleteListing = (listingId) => dealerPlatformApi.delete(`/inventory/${listingId}`);
export const bulkUpdateListings = (data) => dealerPlatformApi.post('/inventory/bulk', data);

// Leads (CRM)
export const getLeads = (params) => dealerPlatformApi.get('/leads', { params });
export const updateLead = (leadId, data) => dealerPlatformApi.put(`/leads/${leadId}`, data);
export const addLeadNote = (leadId, data) => dealerPlatformApi.post(`/leads/${leadId}/notes`, data);
export const createTask = (leadId, data) => dealerPlatformApi.post(`/leads/${leadId}/tasks`, data);

// Pipeline
export const getSalesPipeline = () => dealerPlatformApi.get('/pipeline');

// Marketing
export const getMarketingCampaigns = () => dealerPlatformApi.get('/marketing');
export const createCampaign = (data) => dealerPlatformApi.post('/marketing', data);

// Analytics
export const getDealerAnalytics = () => dealerPlatformApi.get('/analytics');
export const getAIRecommendations = () => dealerPlatformApi.get('/analytics/recommendations');

// Team
export const getTeamMembers = () => dealerPlatformApi.get('/team');
export const inviteTeamMember = (data) => dealerPlatformApi.post('/team/invite', data);
export const updateTeamMember = (memberId, data) => dealerPlatformApi.put(`/team/${memberId}`, data);

// Subscription
export const getSubscription = () => dealerPlatformApi.get('/subscription');

// AI Copilot
export const askDealerCopilot = (data) => dealerPlatformApi.post('/copilot', data);

// Customers
export const getCustomers = () => dealerPlatformApi.get('/customers');
export const getCustomerTimeline = (customerId) => dealerPlatformApi.get(`/customers/${customerId}/timeline`);

// Auctions
export const getAuctionInventory = () => dealerPlatformApi.get('/auctions');

// Finance
export const getFinanceApplications = () => dealerPlatformApi.get('/finance');

// Inspections
export const getInspectionOrders = () => dealerPlatformApi.get('/inspections');

// Reputation
export const getReputation = () => dealerPlatformApi.get('/reputation');

export default dealerPlatformApi;
