import { api } from '../api/httpClient';


// Dashboard
export const getGovernanceDashboard = () => api.get('/governance/dashboard');

// Policies
export const getPolicies = (params) => api.get('/governance/policies', { params });
export const getPolicy = (id) => api.get(`/governance/policies/${id}`);
export const createPolicy = (data) => api.post('/governance/policies', data);
export const updatePolicy = (id, data) => api.put(`/governance/policies/${id}`, data);

// Change Requests
export const getChangeRequests = (params) => api.get('/governance/changes', { params });
export const getChangeRequest = (id) => api.get(`/governance/changes/${id}`);
export const createChangeRequest = (data) => api.post('/governance/changes', data);
export const submitForApproval = (id) => api.post(`/governance/changes/${id}/submit`);
export const approveChangeRequest = (id, comments) => api.post(`/governance/changes/${id}/approve`, { comments });
export const rejectChangeRequest = (id, reason, comments) => api.post(`/governance/changes/${id}/reject`, { reason, comments });

// Approval Rules
export const getApprovalRules = () => api.get('/governance/approvals');
export const createApprovalRule = (data) => api.post('/governance/approvals', data);
export const updateApprovalRule = (id, data) => api.put(`/governance/approvals/${id}`, data);

// Feature Lifecycle
export const getFeatureLifecycles = () => api.get('/governance/features');
export const createFeatureLifecycle = (data) => api.post('/governance/features', data);
export const updateFeatureStage = (id, stage, comments) => api.put(`/governance/features/${id}/stage`, { stage, comments });

// Risks
export const getRisks = () => api.get('/governance/risks');
export const createRisk = (data) => api.post('/governance/risks', data);
export const updateRiskStatus = (id, data) => api.put(`/governance/risks/${id}`, data);

// Standards
export const getStandards = () => api.get('/governance/standards');
export const createStandard = (data) => api.post('/governance/standards', data);

// Country Rules
export const getCountryRules = () => api.get('/governance/countries');
export const createCountryRule = (data) => api.post('/governance/countries', data);

// Partner Requirements
export const getPartnerRequirements = () => api.get('/governance/partners');
export const createPartnerRequirement = (data) => api.post('/governance/partners', data);

// Releases
export const getReleases = () => api.get('/governance/releases');
export const createRelease = (data) => api.post('/governance/releases', data);
export const updateReleaseStatus = (id, data) => api.put(`/governance/releases/${id}`, data);

// Decisions
export const getDecisions = () => api.get('/governance/decisions');
export const createDecision = (data) => api.post('/governance/decisions', data);

// Audit
export const getAuditLogs = (params) => api.get('/governance/audit', { params });

// Compliance
export const getComplianceDashboard = () => api.get('/governance/compliance');

// AI Help
export const getGovernanceHelp = (question) => api.post('/governance/help', { question });

// Reports
export const getGovernanceReport = (params) => api.get('/governance/reports', { params });

