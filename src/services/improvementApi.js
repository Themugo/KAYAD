import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const improvementApi = axios.create({
  baseURL: `${API_URL}/improvement`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// Dashboard
export const getInnovationDashboard = () => improvementApi.get('/dashboard');

// Improvements
export const getImprovementOpportunities = () => improvementApi.get('/opportunities');
export const createImprovement = (data) => improvementApi.post('/improvements', data);
export const updateImprovement = (id, data) => improvementApi.put(`/improvements/${id}`, data);

// AI Recommendations
export const getAIRecommendations = () => improvementApi.get('/recommendations');

// Customer Experience
export const getCustomerExperience = () => improvementApi.get('/customer-experience');

// UX Analytics
export const getUXAnalytics = () => improvementApi.get('/ux-analytics');

// Performance Lab
export const getPerformanceMetrics = () => improvementApi.get('/performance');

// Experiments
export const getExperiments = () => improvementApi.get('/experiments');
export const createExperiment = (data) => improvementApi.post('/experiments', data);
export const updateExperiment = (id, data) => improvementApi.put(`/experiments/${id}`, data);
export const startExperiment = (id) => improvementApi.post(`/experiments/${id}/start`);
export const stopExperiment = (id) => improvementApi.post(`/experiments/${id}/stop`);

// Product Health
export const getProductHealthScores = () => improvementApi.get('/health');

// Innovation Pipeline
export const getInnovationIdeas = () => improvementApi.get('/ideas');
export const createInnovationIdea = (data) => improvementApi.post('/ideas', data);
export const voteIdea = (id) => improvementApi.post(`/ideas/${id}/vote`);
export const updateIdeaStatus = (id, data) => improvementApi.put(`/ideas/${id}/status`, data);

// Roadmap
export const getRoadmap = () => improvementApi.get('/roadmap');

// Optimization
export const getMarketplaceOptimization = () => improvementApi.get('/optimization/marketplace');
export const getSearchOptimization = () => improvementApi.get('/optimization/search');
export const getRevenueOptimization = () => improvementApi.get('/optimization/revenue');

// Reports
export const getImprovementReport = () => improvementApi.get('/report');

// Technical Debt
export const getTechnicalDebt = () => improvementApi.get('/technical-debt');

// AI Assistant
export const askAssistant = (question) => improvementApi.post('/assistant', { question });

export default improvementApi;
