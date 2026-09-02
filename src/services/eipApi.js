import { api } from '../api/httpClient';


// Dashboard
export const getIntegrationDashboard = () => api.get('/integration/dashboard');

// API Marketplace
export const getAPIs = (params) => api.get('/integration/apis', { params });
export const getAPIDetails = (apiId) => api.get(`/integration/apis/${apiId}`);

// Partners
export const getPartners = (params) => api.get('/integration/partners', { params });
export const getPartner = (id) => api.get(`/integration/partners/${id}`);
export const createPartner = (data) => api.post('/integration/partners', data);
export const updatePartner = (id, data) => api.put(`/integration/partners/${id}`, data);
export const deletePartner = (id) => api.delete(`/integration/partners/${id}`);

// API Keys
export const getAPIKeys = (params) => api.get('/integration/api-keys', { params });
export const createAPIKey = (data) => api.post('/integration/api-keys', data);
export const revokeAPIKey = (id) => api.post(`/integration/api-keys/${id}/revoke`);

// Webhooks
export const getWebhooks = (params) => api.get('/integration/webhooks', { params });
export const getWebhook = (id) => api.get(`/integration/webhooks/${id}`);
export const createWebhook = (data) => api.post('/integration/webhooks', data);
export const updateWebhook = (id, data) => api.put(`/integration/webhooks/${id}`, data);
export const deleteWebhook = (id) => api.delete(`/integration/webhooks/${id}`);
export const testWebhook = (id) => api.post(`/integration/webhooks/${id}/test`);
export const getWebhookLogs = (webhookId) => api.get(`/integration/webhooks/${webhookId}/logs`);

// Plugins
export const getPlugins = (params) => api.get('/integration/plugins', { params });
export const getPlugin = (id) => api.get(`/integration/plugins/${id}`);
export const createPlugin = (data) => api.post('/integration/plugins', data);
export const updatePlugin = (id, data) => api.put(`/integration/plugins/${id}`, data);
export const deletePlugin = (id) => api.delete(`/integration/plugins/${id}`);

// Templates
export const getTemplates = (params) => api.get('/integration/templates', { params });
export const getTemplate = (id) => api.get(`/integration/templates/${id}`);

// Analytics
export const getAPIAnalytics = (params) => api.get('/integration/analytics', { params });

// SDKs
export const getSDKs = () => api.get('/integration/sdks');

// OAuth
export const getOAuthConfig = () => api.get('/integration/oauth/config');
export const createOAuthClient = (data) => api.post('/integration/oauth/clients', data);

// Events
export const getEvents = () => api.get('/integration/events');

// Gateway
export const getGatewayStatus = () => api.get('/integration/gateway');

// Sandbox
export const getSandbox = () => api.get('/integration/sandbox');

// Certification
export const getCertificationStatus = () => api.get('/integration/certification');

// AI Assistant
export const getIntegrationHelp = (question) => api.post('/integration/help', { question });

