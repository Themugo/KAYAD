import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const dealerPlatformApi = axios.create({
  baseURL: `${API_URL}/dealer-platform`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
});

export const getDealerDashboard = () => dealerPlatformApi.get('/dashboard').then(r => r.data);
export const getLeads = (params = {}) => dealerPlatformApi.get('/leads', { params }).then(r => r.data);
export const updateLead = (leadId, body) => dealerPlatformApi.put(`/leads/${leadId}`, body).then(r => r.data);
export const getCustomers = () => dealerPlatformApi.get('/customers').then(r => r.data);
export const getMarketingCampaigns = () => dealerPlatformApi.get('/marketing').then(r => r.data);
export const createCampaign = (body) => dealerPlatformApi.post('/marketing', body).then(r => r.data);

export default dealerPlatformApi;
