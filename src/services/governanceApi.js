import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const governanceApi = axios.create({
  baseURL: `${API_URL}/governance`,
  headers: {
    'Content-Type': 'application/json',
  },
});

governanceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard
export const getGovernanceDashboard = () => governanceApi.get('/dashboard');

// Policies
export const getPolicies = (params) => governanceApi.get('/policies', { params });
export const getPolicy = (id) => governanceApi.get(`/policies/${id}`);
export const createPolicy = (data) => governanceApi.post('/policies', data);
export const updatePolicy = (id, data) => governanceApi.put(`/policies/${id}`, data);

// Change Requests
export const getChangeRequests = (params) => governanceApi.get('/changes', { params });
export const getChangeRequest = (id) => governanceApi.get(`/changes/${id}`);
export const createChangeRequest = (data) => governanceApi.post('/changes', data);
export const submitForApproval = (id) => governanceApi.post(`/changes/${id}/submit`);
export const approveChangeRequest = (id, comments) => governanceApi.post(`/changes/${id}/approve`, { comments });
export const rejectChangeRequest = (id, reason, comments) => governanceApi.post(`/changes/${id}/reject`, { reason, comments });

// Approval Rules
export const getApprovalRules = () => governanceApi.get('/approvals');
export const createApprovalRule = (data) => governanceApi.post('/approvals', data);
export const updateApprovalRule = (id, data) => governanceApi.put(`/approvals/${id}`, data);

// Feature Lifecycle
export const getFeatureLifecycles = () => governanceApi.get('/features');
export const createFeatureLifecycle = (data) => governanceApi.post('/features', data);
export const updateFeatureStage = (id, stage, comments) => governanceApi.put(`/features/${id}/stage`, { stage, comments });

// Risks
export const getRisks = () => governanceApi.get('/risks');
export const createRisk = (data) => governanceApi.post('/risks', data);
export const updateRiskStatus = (id, data) => governanceApi.put(`/risks/${id}`, data);

// Standards
export const getStandards = () => governanceApi.get('/standards');
export const createStandard = (data) => governanceApi.post('/standards', data);

// Country Rules
export const getCountryRules = () => governanceApi.get('/countries');
export const createCountryRule = (data) => governanceApi.post('/countries', data);

// Partner Requirements
export const getPartnerRequirements = () => governanceApi.get('/partners');
export const createPartnerRequirement = (data) => governanceApi.post('/partners', data);

// Releases
export const getReleases = () => governanceApi.get('/releases');
export const createRelease = (data) => governanceApi.post('/releases', data);
export const updateReleaseStatus = (id, data) => governanceApi.put(`/releases/${id}`, data);

// Decisions
export const getDecisions = () => governanceApi.get('/decisions');
export const createDecision = (data) => governanceApi.post('/decisions', data);

// Audit
export const getAuditLogs = (params) => governanceApi.get('/audit', { params });

// Compliance
export const getComplianceDashboard = () => governanceApi.get('/compliance');

// AI Help
export const getGovernanceHelp = (question) => governanceApi.post('/help', { question });

// Reports
export const getGovernanceReport = (params) => governanceApi.get('/reports', { params });

export default governanceApi;
