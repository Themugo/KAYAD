import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ecpApi = axios.create({
  baseURL: `${API_URL}/ecp`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// Dashboard
export const getExecutiveDashboard = () => ecpApi.get('/dashboard');
export const getExecutive = () => ecpApi.get('/executive');

// System Health
export const getSystemHealth = () => ecpApi.get('/health');
export const checkServiceHealth = (serviceId) => ecpApi.get(`/health/${serviceId}`);

// Business Health
export const getBusinessHealth = () => ecpApi.get('/business');

// Incidents
export const getIncidents = (params) => ecpApi.get('/incidents', { params });
export const getIncident = (id) => ecpApi.get(`/incidents/${id}`);
export const createIncident = (data) => ecpApi.post('/incidents', data);
export const updateIncident = (id, data) => ecpApi.put(`/incidents/${id}`, data);
export const deleteIncident = (id) => ecpApi.delete(`/incidents/${id}`);

// Alerts
export const getAlerts = (params) => ecpApi.get('/alerts', { params });
export const createAlert = (data) => ecpApi.post('/alerts', data);
export const acknowledgeAlert = (id) => ecpApi.post(`/alerts/${id}/acknowledge`);
export const resolveAlert = (id) => ecpApi.post(`/alerts/${id}/resolve`);

// Self-Healing
export const getSelfHealingActions = () => ecpApi.get('/self-healing');
export const getSelfHealingRules = () => ecpApi.get('/self-healing/rules');
export const executeSelfHealingAction = (data) => ecpApi.post('/self-healing/execute', data);

// AI Analysis
export const getRootCauseAnalysis = (incidentId) => ecpApi.get(`/analysis/${incidentId}`);
export const askOperationsQuestion = (question) => ecpApi.post('/ask', { question });

// Performance
export const getPerformanceMetrics = (params) => ecpApi.get('/performance', { params });

// Security
export const getSecurityStatus = () => ecpApi.get('/security');

// Capacity
export const getCapacityPlanning = () => ecpApi.get('/capacity');

// Compliance
export const getComplianceStatus = () => ecpApi.get('/compliance');

// Audit
export const getAuditLogs = (params) => ecpApi.get('/audit', { params });

// Deployment
export const getDeployments = () => ecpApi.get('/deployments');

// Disaster Recovery
export const getDisasterRecovery = () => ecpApi.get('/disaster-recovery');

export default ecpApi;
