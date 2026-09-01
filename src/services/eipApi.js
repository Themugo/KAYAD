import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const eipApi = axios.create({
  baseURL: `${API_URL}/integration`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// Dashboard
export const getIntegrationDashboard = () => eipApi.get('/dashboard');

// API Marketplace
export const getAPIs = (params) => eipApi.get('/apis', { params });
export const getAPIDetails = (apiId) => eipApi.get(`/apis/${apiId}`);

// Partners
export const getPartners = (params) => eipApi.get('/partners', { params });
export const getPartner = (id) => eipApi.get(`/partners/${id}`);
export const createPartner = (data) => eipApi.post('/partners', data);
export const updatePartner = (id, data) => eipApi.put(`/partners/${id}`, data);
export const deletePartner = (id) => eipApi.delete(`/partners/${id}`);

// API Keys
export const getAPIKeys = (params) => eipApi.get('/api-keys', { params });
export const createAPIKey = (data) => eipApi.post('/api-keys', data);
export const revokeAPIKey = (id) => eipApi.post(`/api-keys/${id}/revoke`);

// Webhooks
export const getWebhooks = (params) => eipApi.get('/webhooks', { params });
export const getWebhook = (id) => eipApi.get(`/webhooks/${id}`);
export const createWebhook = (data) => eipApi.post('/webhooks', data);
export const updateWebhook = (id, data) => eipApi.put(`/webhooks/${id}`, data);
export const deleteWebhook = (id) => eipApi.delete(`/webhooks/${id}`);
export const testWebhook = (id) => eipApi.post(`/webhooks/${id}/test`);
export const getWebhookLogs = (webhookId) => eipApi.get(`/webhooks/${webhookId}/logs`);

// Plugins
export const getPlugins = (params) => eipApi.get('/plugins', { params });
export const getPlugin = (id) => eipApi.get(`/plugins/${id}`);
export const createPlugin = (data) => eipApi.post('/plugins', data);
export const updatePlugin = (id, data) => eipApi.put(`/plugins/${id}`, data);
export const deletePlugin = (id) => eipApi.delete(`/plugins/${id}`);

// Templates
export const getTemplates = (params) => eipApi.get('/templates', { params });
export const getTemplate = (id) => eipApi.get(`/templates/${id}`);

// Analytics
export const getAPIAnalytics = (params) => eipApi.get('/analytics', { params });

// SDKs
export const getSDKs = () => eipApi.get('/sdks');

// OAuth
export const getOAuthConfig = () => eipApi.get('/oauth/config');
export const createOAuthClient = (data) => eipApi.post('/oauth/clients', data);

// Events
export const getEvents = () => eipApi.get('/events');

// Gateway
export const getGatewayStatus = () => eipApi.get('/gateway');

// Sandbox
export const getSandbox = () => eipApi.get('/sandbox');

// Certification
export const getCertificationStatus = () => eipApi.get('/certification');

// AI Assistant
export const getIntegrationHelp = (question) => eipApi.post('/help', { question });

export default eipApi;
