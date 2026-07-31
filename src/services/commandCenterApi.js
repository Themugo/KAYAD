import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const commandCenterApi = axios.create({
  baseURL: `${API_URL}/command-center`,
  headers: {
    'Content-Type': 'application/json',
  },
});

commandCenterApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mission Control
export const getMissionControl = () => commandCenterApi.get('/mission-control');
export const getLiveActivity = (params) => commandCenterApi.get('/live-activity', { params });

// Operations Centers
export const getOperationsCenter = () => commandCenterApi.get('/operations');
export const getMarketplaceCenter = () => commandCenterApi.get('/marketplace');
export const getDealerOperations = () => commandCenterApi.get('/dealers');
export const getAuctionOperations = () => commandCenterApi.get('/auctions');
export const getInspectionOperations = () => commandCenterApi.get('/inspections');
export const getFinanceOperations = () => commandCenterApi.get('/finance');
export const getSupportOperations = () => commandCenterApi.get('/support');
export const getSecurityOperations = () => commandCenterApi.get('/security');
export const getInfrastructureOperations = () => commandCenterApi.get('/infrastructure');
export const getAIOperations = () => commandCenterApi.get('/ai');

// Actions
export const getPendingActions = () => commandCenterApi.get('/actions');
export const executeAction = (data) => commandCenterApi.post('/actions/execute', data);

// Notifications
export const getNotifications = () => commandCenterApi.get('/notifications');
export const markNotificationRead = (notificationId) => commandCenterApi.put(`/notifications/${notificationId}/read`);

// Decisions
export const getDecisions = () => commandCenterApi.get('/decisions');

// Command Palette
export const getCommands = () => commandCenterApi.get('/commands');
export const executeCommand = (data) => commandCenterApi.post('/commands/execute', data);

// War Room
export const getWarRoom = () => commandCenterApi.get('/war-room');
export const activateWarRoom = (data) => commandCenterApi.post('/war-room/activate', data);
export const deactivateWarRoom = () => commandCenterApi.post('/war-room/deactivate');

// Timeline
export const getExecutiveTimeline = (params) => commandCenterApi.get('/timeline', { params });

// Briefing
export const getExecutiveBriefing = () => commandCenterApi.get('/briefing');

// Search
export const enterpriseSearch = (params) => commandCenterApi.get('/search', { params });

// Widgets
export const getWidgets = () => commandCenterApi.get('/widgets');
export const saveWidgetLayout = (data) => commandCenterApi.post('/widgets/layout', data);

// Regional Map
export const getRegionalMap = () => commandCenterApi.get('/map');

export default commandCenterApi;
