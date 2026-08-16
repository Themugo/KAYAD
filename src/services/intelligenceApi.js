import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const intelligenceApi = axios.create({
  baseURL: `${API_URL}/intelligence`,
  headers: {
    'Content-Type': 'application/json',
  },
});

intelligenceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard
export const getExecutiveDashboard = () => intelligenceApi.get('/dashboard');

// Intelligence Modules
export const getMarketplaceIntelligence = () => intelligenceApi.get('/marketplace');
export const getDealerIntelligence = () => intelligenceApi.get('/dealers');
export const getAuctionIntelligence = () => intelligenceApi.get('/auctions');
export const getFinanceIntelligence = () => intelligenceApi.get('/finance');
export const getInspectionIntelligence = () => intelligenceApi.get('/inspections');
export const getMarketingIntelligence = () => intelligenceApi.get('/marketing');
export const getCustomerIntelligence = () => intelligenceApi.get('/customers');
export const getCountryIntelligence = () => intelligenceApi.get('/countries');
export const getRevenueIntelligence = () => intelligenceApi.get('/revenue');

// Forecasting
export const getForecasts = () => intelligenceApi.get('/forecasts');

// AI Insights
export const getAIInsights = () => intelligenceApi.get('/insights');

// Benchmarking
export const getBenchmarks = () => intelligenceApi.get('/benchmarks');

// Reports
export const getReports = () => intelligenceApi.get('/reports');
export const generateReport = (data) => intelligenceApi.post('/reports/generate', data);
export const downloadReport = (reportId) => intelligenceApi.get(`/reports/download/${reportId}`);

// Self-Service
export const queryIntelligence = (query) => intelligenceApi.post('/query', { query });

// Exports
export const exportData = (data) => intelligenceApi.post('/exports', data);

// Scheduled Reports
export const getScheduledReports = () => intelligenceApi.get('/scheduled');
export const createScheduledReport = (data) => intelligenceApi.post('/scheduled', data);

export default intelligenceApi;
