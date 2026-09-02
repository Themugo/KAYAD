import { api } from '../api/httpClient';


// Dashboard
export const getAIDashboard = () => api.get('/ai/dashboard');
export const getAIAnalytics = () => api.get('/ai/analytics');
export const getAISuggestions = () => api.get('/ai/suggestions');
export const getPlatformHealth = () => api.get('/ai/health');
export const getCommandTemplates = () => api.get('/ai/templates');

// Commands
export const processAICommand = (data) => api.post('/ai/command', data);
export const approveAICommand = (commandId) => api.post(`/ai/command/${commandId}/approve`);
export const rejectAICommand = (commandId, reason) => api.post(`/ai/command/${commandId}/reject`, { reason });
export const getCommandHistory = (params) => api.get('/ai/history', { params });
export const rollbackCommand = (commandId) => api.post(`/ai/history/${commandId}/rollback`);

// Conversations
export const getConversations = () => api.get('/ai/conversations');
export const getConversation = (id) => api.get(`/ai/conversations/${id}`);
export const addMessageToConversation = (conversationId, message) => api.post(`/ai/conversations/${conversationId}/message`, { message });

// Prompts
export const getPrompts = (params) => api.get('/ai/prompts', { params });
export const createPrompt = (data) => api.post('/ai/prompts', data);
export const updatePrompt = (id, data) => api.put(`/ai/prompts/${id}`, data);
export const deletePrompt = (id) => api.delete(`/ai/prompts/${id}`);
export const executePrompt = (data) => api.post('/ai/prompts/execute', data);

// Knowledge
export const getKnowledgeBase = (params) => api.get('/ai/knowledge', { params });
export const addKnowledge = (data) => api.post('/ai/knowledge', data);
export const updateKnowledge = (id, data) => api.put(`/ai/knowledge/${id}`, data);
export const deleteKnowledge = (id) => api.delete(`/ai/knowledge/${id}`);

// Workspaces
export const getWorkspaces = () => api.get('/ai/workspaces');
export const createWorkspace = (data) => api.post('/ai/workspaces', data);
export const updateWorkspace = (id, data) => api.put(`/ai/workspaces/${id}`, data);
export const deleteWorkspace = (id) => api.delete(`/ai/workspaces/${id}`);

