import { api } from '../api/httpClient';


// Dashboard
export const getExecutiveDashboard = () => api.get('/intelligence/dashboard');

// Intelligence Modules
export const getMarketplaceIntelligence = () => api.get('/intelligence/marketplace');
export const getDealerIntelligence = () => api.get('/intelligence/dealers');
export const getAuctionIntelligence = () => api.get('/intelligence/auctions');
export const getFinanceIntelligence = () => api.get('/intelligence/finance');
export const getInspectionIntelligence = () => api.get('/intelligence/inspections');
export const getMarketingIntelligence = () => api.get('/intelligence/marketing');
export const getCustomerIntelligence = () => api.get('/intelligence/customers');
export const getCountryIntelligence = () => api.get('/intelligence/countries');
export const getRevenueIntelligence = () => api.get('/intelligence/revenue');

// Forecasting
export const getForecasts = () => api.get('/intelligence/forecasts');

// AI Insights
export const getAIInsights = () => api.get('/intelligence/insights');

// Benchmarking
export const getBenchmarks = () => api.get('/intelligence/benchmarks');

// Reports
export const getReports = () => api.get('/intelligence/reports');
export const generateReport = (data) => api.post('/intelligence/reports/generate', data);
export const downloadReport = (reportId) => api.get(`/intelligence/reports/download/${reportId}`);

// Self-Service
export const queryIntelligence = (query) => api.post('/intelligence/query', { query });

// Exports
export const exportData = (data) => api.post('/intelligence/exports', data);

// Scheduled Reports
export const getScheduledReports = () => api.get('/intelligence/scheduled');
export const createScheduledReport = (data) => api.post('/intelligence/scheduled', data);

