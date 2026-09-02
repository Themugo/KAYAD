import { api } from '../api/httpClient';


// ============================================
// DASHBOARD & STATS
// ============================================

export const getAutomationStats = () => api.get('/automation/stats');
export const getWorkflowLogs = (params) => api.get('/automation/logs', { params });
export const getAISuggestions = () => api.get('/automation/ai-suggestions');
export const getWorkflowTemplates = () => api.get('/automation/templates');
export const getTriggerTypes = () => api.get('/automation/trigger-types');
export const getActionTypes = () => api.get('/automation/action-types');

// ============================================
// WORKFLOWS
// ============================================

export const getWorkflows = (params) => api.get('/automation/workflows', { params });
export const getWorkflowById = (id) => api.get(`/automation/workflows/${id}`);
export const createWorkflow = (data) => api.post('/automation/workflows', data);
export const updateWorkflow = (id, data) => api.put(`/automation/workflows/${id}`, data);
export const deleteWorkflow = (id) => api.delete(`/automation/workflows/${id}`);
export const publishWorkflow = (id) => api.post(`/automation/workflows/${id}/publish`);
export const pauseWorkflow = (id) => api.post(`/automation/workflows/${id}/pause`);
export const simulateWorkflow = (id, context) => api.post(`/automation/workflows/${id}/simulate`, context);

// ============================================
// BUSINESS RULES
// ============================================

export const getBusinessRules = (params) => api.get('/automation/rules', { params });
export const getBusinessRuleById = (id) => api.get(`/automation/rules/${id}`);
export const createBusinessRule = (data) => api.post('/automation/rules', data);
export const updateBusinessRule = (id, data) => api.put(`/automation/rules/${id}`, data);
export const deleteBusinessRule = (id) => api.delete(`/automation/rules/${id}`);
export const evaluateRules = (data) => api.post('/automation/rules/evaluate', data);

// ============================================
// APPROVAL CHAINS
// ============================================

export const getApprovalChains = () => api.get('/automation/approvals');
export const getApprovalChainById = (id) => api.get(`/automation/approvals/${id}`);
export const createApprovalChain = (data) => api.post('/automation/approvals', data);
export const updateApprovalChain = (id, data) => api.put(`/automation/approvals/${id}`, data);
export const deleteApprovalChain = (id) => api.delete(`/automation/approvals/${id}`);
export const initiateApproval = (data) => api.post('/automation/approvals/initiate', data);

// ============================================
// TASKS
// ============================================

export const getTasks = (params) => api.get('/automation/tasks', { params });
export const getTaskById = (id) => api.get(`/automation/tasks/${id}`);
export const createTask = (data) => api.post('/automation/tasks', data);
export const updateTask = (id, data) => api.put(`/automation/tasks/${id}`, data);
export const completeTask = (id, data) => api.post(`/automation/tasks/${id}/complete`, data);
export const escalateTask = (id, data) => api.post(`/automation/tasks/${id}/escalate`, data);

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export const getNotificationTemplates = (params) => api.get('/automation/templates/notifications', { params });
export const getNotificationTemplateById = (id) => api.get(`/automation/templates/notifications/${id}`);
export const createNotificationTemplate = (data) => api.post('/automation/templates/notifications', data);
export const updateNotificationTemplate = (id, data) => api.put(`/automation/templates/notifications/${id}`, data);
export const deleteNotificationTemplate = (id) => api.delete(`/automation/templates/notifications/${id}`);
export const previewNotification = (data) => api.post('/automation/templates/notifications/preview', data);

// ============================================
// SCHEDULED JOBS
// ============================================

export const getScheduledJobs = (params) => api.get('/automation/scheduled', { params });
export const createScheduledJob = (data) => api.post('/automation/scheduled', data);
export const updateScheduledJob = (id, data) => api.put(`/automation/scheduled/${id}`, data);
export const deleteScheduledJob = (id) => api.delete(`/automation/scheduled/${id}`);
export const runScheduledJobNow = (id) => api.post(`/automation/scheduled/${id}/run`);

