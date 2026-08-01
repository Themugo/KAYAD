import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ghostCheckersApi = axios.create({
  baseURL: `${API_URL}/ghost-checkers`,
  headers: {
    'Content-Type': 'application/json',
  },
});

ghostCheckersApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Landing
export const getLandingData = () => ghostCheckersApi.get('/landing');

// Booking
export const createBooking = (data) => ghostCheckersApi.post('/booking', data);
export const getInspectionStatus = (reference) => ghostCheckersApi.get(`/status/${reference}`);

// Packages
export const getPackages = () => ghostCheckersApi.get('/packages');

// Inspectors
export const getInspectors = (params) => ghostCheckersApi.get('/inspectors', { params });
export const getInspectorProfile = (inspectorId) => ghostCheckersApi.get(`/inspectors/${inspectorId}`);

// Checklist
export const getInspectionChecklist = () => ghostCheckersApi.get('/checklist');

// Vehicle Passport
export const getVehiclePassport = (vin) => ghostCheckersApi.get(`/passport/${vin}`);

// Reports
export const getInspectionReport = (reportId) => ghostCheckersApi.get(`/reports/${reportId}`);

// Analytics
export const getAnalytics = () => ghostCheckersApi.get('/analytics');

// AI Assistant
export const askAssistant = (data) => ghostCheckersApi.post('/assistant', data);

// Dealer Certification
export const getDealerCertification = () => ghostCheckersApi.get('/certification');

export default ghostCheckersApi;
