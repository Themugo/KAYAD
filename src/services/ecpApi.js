import { api } from '../api/httpClient';


// Dashboard
export const getExecutiveDashboard = () => api.get('/ecp/dashboard');
export const getExecutive = () => api.get('/ecp/executive');

// System Health
export const getSystemHealth = () => api.get('/ecp/health');
export const checkServiceHealth = (serviceId) => api.get(`/ecp/health/${serviceId}`);

// Business Health
export const getBusinessHealth = () => api.get('/ecp/business');

// Incidents
export const getIncidents = (params) => api.get('/ecp/incidents', { params });
export const getIncident = (id) => api.get(`/ecp/incidents/${id}`);
export const createIncident = (data) => api.post('/ecp/incidents', data);
export const updateIncident = (id, data) => api.put(`/ecp/incidents/${id}`, data);
export const deleteIncident = (id) => api.delete(`/ecp/incidents/${id}`);

// Alerts
export const getAlerts = (params) => api.get('/ecp/alerts', { params });
export const createAlert = (data) => api.post('/ecp/alerts', data);
export const acknowledgeAlert = (id) => api.post(`/ecp/alerts/${id}/acknowledge`);
export const resolveAlert = (id) => api.post(`/ecp/alerts/${id}/resolve`);

// Self-Healing
export const getSelfHealingActions = () => api.get('/ecp/self-healing');
export const getSelfHealingRules = () => api.get('/ecp/self-healing/rules');
export const executeSelfHealingAction = (data) => api.post('/ecp/self-healing/execute', data);

// AI Analysis
export const getRootCauseAnalysis = (incidentId) => api.get(`/ecp/analysis/${incidentId}`);
export const askOperationsQuestion = (question) => api.post('/ecp/ask', { question });

// Performance
export const getPerformanceMetrics = (params) => api.get('/ecp/performance', { params });

// Security
export const getSecurityStatus = () => api.get('/ecp/security');

// Capacity
export const getCapacityPlanning = () => api.get('/ecp/capacity');

// Compliance
export const getComplianceStatus = () => api.get('/ecp/compliance');

// Audit
export const getAuditLogs = (params) => api.get('/ecp/audit', { params });

// Deployment
export const getDeployments = () => api.get('/ecp/deployments');

// Disaster Recovery
export const getDisasterRecovery = () => api.get('/ecp/disaster-recovery');

