import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const aiApi = axios.create({
  baseURL: `${API_URL}/ai`,
  headers: {
    'Content-Type': 'application/json',
  },
});

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard
export const getAIDashboard = () => aiApi.get('/dashboard');
export const getAIAnalytics = () => aiApi.get('/analytics');
export const getAISuggestions = () => aiApi.get('/suggestions');
export const getPlatformHealth = () => aiApi.get('/health');
export const getCommandTemplates = () => aiApi.get('/templates');

// Commands
export const processAICommand = (data) => aiApi.post('/command', data);
export const approveAICommand = (commandId) => aiApi.post(`/command/${commandId}/approve`);
export const rejectAICommand = (commandId, reason) => aiApi.post(`/command/${commandId}/reject`, { reason });
export const getCommandHistory = (params) => aiApi.get('/history', { params });
export const rollbackCommand = (commandId) => aiApi.post(`/history/${commandId}/rollback`);

// Conversations
export const getConversations = () => aiApi.get('/conversations');
export const getConversation = (id) => aiApi.get(`/conversations/${id}`);
export const addMessageToConversation = (conversationId, message) => aiApi.post(`/conversations/${conversationId}/message`, { message });

// Prompts
export const getPrompts = (params) => aiApi.get('/prompts', { params });
export const createPrompt = (data) => aiApi.post('/prompts', data);
export const updatePrompt = (id, data) => aiApi.put(`/prompts/${id}`, data);
export const deletePrompt = (id) => aiApi.delete(`/prompts/${id}`);
export const executePrompt = (data) => aiApi.post('/prompts/execute', data);

// Knowledge
export const getKnowledgeBase = (params) => aiApi.get('/knowledge', { params });
export const addKnowledge = (data) => aiApi.post('/knowledge', data);
export const updateKnowledge = (id, data) => aiApi.put(`/knowledge/${id}`, data);
export const deleteKnowledge = (id) => aiApi.delete(`/knowledge/${id}`);

// Workspaces
export const getWorkspaces = () => aiApi.get('/workspaces');
export const createWorkspace = (data) => aiApi.post('/workspaces', data);
export const updateWorkspace = (id, data) => aiApi.put(`/workspaces/${id}`, data);
export const deleteWorkspace = (id) => aiApi.delete(`/workspaces/${id}`);

export default aiApi;
