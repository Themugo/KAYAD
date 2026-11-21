import { api } from '../api/httpClient';


// Dashboard
export const getDigitalTwinDashboard = () => api.get('/digital-twin/dashboard');

// Simulations
export const getSimulations = (params) => api.get('/digital-twin/simulations', { params });
export const getSimulation = (id) => api.get(`/digital-twin/simulations/${id}`);
export const createSimulation = (data) => api.post('/digital-twin/simulations', data);
export const runSimulation = (id) => api.post(`/digital-twin/simulations/${id}/run`);
export const deleteSimulation = (id) => api.delete(`/digital-twin/simulations/${id}`);
export const getSimulationHistory = (params) => api.get('/digital-twin/simulations/history', { params });
export const compareSimulations = (ids) => api.post('/digital-twin/simulations/compare', { ids });

// Scenarios
export const getScenarios = (params) => api.get('/digital-twin/scenarios', { params });
export const getScenario = (id) => api.get(`/digital-twin/scenarios/${id}`);
export const createScenario = (data) => api.post('/digital-twin/scenarios', data);
export const updateScenario = (id, data) => api.put(`/digital-twin/scenarios/${id}`, data);
export const deleteScenario = (id) => api.delete(`/digital-twin/scenarios/${id}`);
export const runScenario = (id, customParameters) => api.post(`/digital-twin/scenarios/${id}/run`, { customParameters });
export const getScenarioTemplates = () => api.get('/digital-twin/scenarios/templates');

// Predictions
export const getPredictions = (params) => api.get('/digital-twin/predictions', { params });
export const generatePrediction = (data) => api.post('/digital-twin/predictions', data);

// What-If
export const whatIfAnalysis = (question) => api.post('/digital-twin/what-if', { question });

