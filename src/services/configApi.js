import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const configApi = axios.create({
  baseURL: `${API_URL}/config`,
  headers: {
    'Content-Type': 'application/json',
  },
});

configApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// DASHBOARD & STATS
// ============================================

export const getConfigStats = () => configApi.get('/stats');
export const exportConfig = (params) => configApi.get('/export', { params });
export const importConfig = (data) => configApi.post('/import', data);

// ============================================
// CONFIG ENTRIES
// ============================================

export const getConfigEntries = (params) => configApi.get('/entries', { params });
export const getConfigEntry = (id) => configApi.get(`/entries/${id}`);
export const createConfigEntry = (data) => configApi.post('/entries', data);
export const updateConfigEntry = (id, data) => configApi.put(`/entries/${id}`, data);
export const deleteConfigEntry = (id) => configApi.delete(`/entries/${id}`);
export const bulkUpdateConfigEntries = (data) => configApi.post('/entries/bulk', data);

// ============================================
// FEATURE FLAGS
// ============================================

export const getFeatureFlags = (params) => configApi.get('/features', { params });
export const getFeatureFlag = (id) => configApi.get(`/features/${id}`);
export const createFeatureFlag = (data) => configApi.post('/features', data);
export const updateFeatureFlag = (id, data) => configApi.put(`/features/${id}`, data);
export const deleteFeatureFlag = (id) => configApi.delete(`/features/${id}`);
export const toggleFeatureFlag = (id) => configApi.post(`/features/${id}/toggle`);
export const checkFeatureFlag = (key, params) => configApi.get(`/features/check/${key}`, { params });

// ============================================
// REFERENCE DATA
// ============================================

export const getReferenceData = (params) => configApi.get('/reference', { params });
export const getReferenceTypes = () => configApi.get('/reference/types');
export const getReferenceDataById = (id) => configApi.get(`/reference/${id}`);
export const createReferenceData = (data) => configApi.post('/reference', data);
export const updateReferenceData = (id, data) => configApi.put(`/reference/${id}`, data);
export const deleteReferenceData = (id) => configApi.delete(`/reference/${id}`);

// ============================================
// VEHICLE MASTER DATA
// ============================================

export const getVehicleMasterData = (params) => configApi.get('/vehicle', { params });
export const getVehicleTypes = () => configApi.get('/vehicle/types');
export const getVehicleMakes = () => configApi.get('/vehicle/makes');
export const getVehicleModels = (params) => configApi.get('/vehicle/models', { params });
export const getVehicleMasterDataById = (id) => configApi.get(`/vehicle/${id}`);
export const createVehicleMasterData = (data) => configApi.post('/vehicle', data);
export const updateVehicleMasterData = (id, data) => configApi.put(`/vehicle/${id}`, data);
export const deleteVehicleMasterData = (id) => configApi.delete(`/vehicle/${id}`);

// ============================================
// LOCATION MASTER DATA
// ============================================

export const getLocationMasterData = (params) => configApi.get('/location', { params });
export const getLocationTypes = () => configApi.get('/location/types');
export const getCountries = () => configApi.get('/location/countries');
export const getRegions = (params) => configApi.get('/location/regions', { params });
export const getCities = (params) => configApi.get('/location/cities', { params });
export const createLocationMasterData = (data) => configApi.post('/location', data);
export const updateLocationMasterData = (id, data) => configApi.put(`/location/${id}`, data);
export const deleteLocationMasterData = (id) => configApi.delete(`/location/${id}`);

// ============================================
// COUNTRY CONFIGURATION
// ============================================

export const getCountryConfigs = (params) => configApi.get('/countries', { params });
export const getCountryConfig = (id) => configApi.get(`/countries/${id}`);
export const createCountryConfig = (data) => configApi.post('/countries', data);
export const updateCountryConfig = (id, data) => configApi.put(`/countries/${id}`, data);
export const deleteCountryConfig = (id) => configApi.delete(`/countries/${id}`);

// ============================================
// AUDIT
// ============================================

export const getConfigAuditLogs = (params) => configApi.get('/audit', { params });
export const rollbackConfig = (logId) => configApi.post(`/audit/${logId}/rollback`);

export default configApi;
