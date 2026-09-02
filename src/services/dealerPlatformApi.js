import { api } from '../api/httpClient';

export const getDealerDashboard = () => api.get('/dealer-platform/dashboard').then(r => r.data);
export const getLeads = (params = {}) => api.get('/dealer-platform/leads', { params }).then(r => r.data);
export const updateLead = (leadId, body) => api.put(`/dealer-platform/leads/${leadId}`, body).then(r => r.data);
export const getCustomers = () => api.get('/dealer-platform/customers').then(r => r.data);
export const getMarketingCampaigns = () => api.get('/dealer-platform/marketing').then(r => r.data);
export const createCampaign = (body) => api.post('/dealer-platform/marketing', body).then(r => r.data);

