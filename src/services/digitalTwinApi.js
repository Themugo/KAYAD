import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const digitalTwinApi = axios.create({
  baseURL: `${API_URL}/digital-twin`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// Dashboard
export const getDigitalTwinDashboard = () => digitalTwinApi.get('/dashboard');

// Simulations
export const getSimulations = (params) => digitalTwinApi.get('/simulations', { params });
export const getSimulation = (id) => digitalTwinApi.get(`/simulations/${id}`);
export const createSimulation = (data) => digitalTwinApi.post('/simulations', data);
export const runSimulation = (id) => digitalTwinApi.post(`/simulations/${id}/run`);
export const deleteSimulation = (id) => digitalTwinApi.delete(`/simulations/${id}`);
export const getSimulationHistory = (params) => digitalTwinApi.get('/simulations/history', { params });
export const compareSimulations = (ids) => digitalTwinApi.post('/simulations/compare', { ids });

// Scenarios
export const getScenarios = (params) => digitalTwinApi.get('/scenarios', { params });
export const getScenario = (id) => digitalTwinApi.get(`/scenarios/${id}`);
export const createScenario = (data) => digitalTwinApi.post('/scenarios', data);
export const updateScenario = (id, data) => digitalTwinApi.put(`/scenarios/${id}`, data);
export const deleteScenario = (id) => digitalTwinApi.delete(`/scenarios/${id}`);
export const runScenario = (id, customParameters) => digitalTwinApi.post(`/scenarios/${id}/run`, { customParameters });
export const getScenarioTemplates = () => digitalTwinApi.get('/scenarios/templates');

// Predictions
export const getPredictions = (params) => digitalTwinApi.get('/predictions', { params });
export const generatePrediction = (data) => digitalTwinApi.post('/predictions', data);

// What-If
export const whatIfAnalysis = (question) => digitalTwinApi.post('/what-if', { question });

export default digitalTwinApi;
