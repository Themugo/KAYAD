import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const automationApi = axios.create({
  baseURL: `${API_URL}/automation`,
  headers: {
    'Content-Type': 'application/json',
  },
});

automationApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// DASHBOARD & STATS
// ============================================

export const getAutomationStats = () => automationApi.get('/stats');
export const getWorkflowLogs = (params) => automationApi.get('/logs', { params });
export const getAISuggestions = () => automationApi.get('/ai-suggestions');
export const getWorkflowTemplates = () => automationApi.get('/templates');
export const getTriggerTypes = () => automationApi.get('/trigger-types');
export const getActionTypes = () => automationApi.get('/action-types');

// ============================================
// WORKFLOWS
// ============================================

export const getWorkflows = (params) => automationApi.get('/workflows', { params });
export const getWorkflowById = (id) => automationApi.get(`/workflows/${id}`);
export const createWorkflow = (data) => automationApi.post('/workflows', data);
export const updateWorkflow = (id, data) => automationApi.put(`/workflows/${id}`, data);
export const deleteWorkflow = (id) => automationApi.delete(`/workflows/${id}`);
export const publishWorkflow = (id) => automationApi.post(`/workflows/${id}/publish`);
export const pauseWorkflow = (id) => automationApi.post(`/workflows/${id}/pause`);
export const simulateWorkflow = (id, context) => automationApi.post(`/workflows/${id}/simulate`, context);

// ============================================
// BUSINESS RULES
// ============================================

export const getBusinessRules = (params) => automationApi.get('/rules', { params });
export const getBusinessRuleById = (id) => automationApi.get(`/rules/${id}`);
export const createBusinessRule = (data) => automationApi.post('/rules', data);
export const updateBusinessRule = (id, data) => automationApi.put(`/rules/${id}`, data);
export const deleteBusinessRule = (id) => automationApi.delete(`/rules/${id}`);
export const evaluateRules = (data) => automationApi.post('/rules/evaluate', data);

// ============================================
// APPROVAL CHAINS
// ============================================

export const getApprovalChains = () => automationApi.get('/approvals');
export const getApprovalChainById = (id) => automationApi.get(`/approvals/${id}`);
export const createApprovalChain = (data) => automationApi.post('/approvals', data);
export const updateApprovalChain = (id, data) => automationApi.put(`/approvals/${id}`, data);
export const deleteApprovalChain = (id) => automationApi.delete(`/approvals/${id}`);
export const initiateApproval = (data) => automationApi.post('/approvals/initiate', data);

// ============================================
// TASKS
// ============================================

export const getTasks = (params) => automationApi.get('/tasks', { params });
export const getTaskById = (id) => automationApi.get(`/tasks/${id}`);
export const createTask = (data) => automationApi.post('/tasks', data);
export const updateTask = (id, data) => automationApi.put(`/tasks/${id}`, data);
export const completeTask = (id, data) => automationApi.post(`/tasks/${id}/complete`, data);
export const escalateTask = (id, data) => automationApi.post(`/tasks/${id}/escalate`, data);

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export const getNotificationTemplates = (params) => automationApi.get('/templates/notifications', { params });
export const getNotificationTemplateById = (id) => automationApi.get(`/templates/notifications/${id}`);
export const createNotificationTemplate = (data) => automationApi.post('/templates/notifications', data);
export const updateNotificationTemplate = (id, data) => automationApi.put(`/templates/notifications/${id}`, data);
export const deleteNotificationTemplate = (id) => automationApi.delete(`/templates/notifications/${id}`);
export const previewNotification = (data) => automationApi.post('/templates/notifications/preview', data);

// ============================================
// SCHEDULED JOBS
// ============================================

export const getScheduledJobs = (params) => automationApi.get('/scheduled', { params });
export const createScheduledJob = (data) => automationApi.post('/scheduled', data);
export const updateScheduledJob = (id, data) => automationApi.put(`/scheduled/${id}`, data);
export const deleteScheduledJob = (id) => automationApi.delete(`/scheduled/${id}`);
export const runScheduledJobNow = (id) => automationApi.post(`/scheduled/${id}/run`);

export default automationApi;
