import { api } from '../api/httpClient';


// Landing
export const getLandingData = () => api.get('/ghost-checkers/landing');

// Booking
export const createBooking = (data) => api.post('/ghost-checkers/booking', data);
export const getInspectionStatus = (reference) => api.get(`/ghost-checkers/status/${reference}`);

// Packages
export const getPackages = () => api.get('/ghost-checkers/packages');

// Inspectors
export const getInspectors = (params) => api.get('/ghost-checkers/inspectors', { params });
export const getInspectorProfile = (inspectorId) => api.get(`/ghost-checkers/inspectors/${inspectorId}`);

// Checklist
export const getInspectionChecklist = () => api.get('/ghost-checkers/checklist');

// Vehicle Passport
export const getVehiclePassport = (vin) => api.get(`/ghost-checkers/passport/${vin}`);

// Reports
export const getInspectionReport = (reportId) => api.get(`/ghost-checkers/reports/${reportId}`);

// Analytics
export const getAnalytics = () => api.get('/ghost-checkers/analytics');

// AI Assistant
export const askAssistant = (data) => api.post('/ghost-checkers/assistant', data);

// Dealer Certification
export const getDealerCertification = () => api.get('/ghost-checkers/certification');

