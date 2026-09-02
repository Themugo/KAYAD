import { api } from '../api/httpClient';


// ============================================
// DASHBOARD & STATS
// ============================================

export const getConfigStats = () => api.get('/config/stats');
export const exportConfig = (params) => api.get('/config/export', { params });
export const importConfig = (data) => api.post('/config/import', data);

// ============================================
// CONFIG ENTRIES
// ============================================

export const getConfigEntries = (params) => api.get('/config/entries', { params });
export const getConfigEntry = (id) => api.get(`/config/entries/${id}`);
export const createConfigEntry = (data) => api.post('/config/entries', data);
export const updateConfigEntry = (id, data) => api.put(`/config/entries/${id}`, data);
export const deleteConfigEntry = (id) => api.delete(`/config/entries/${id}`);
export const bulkUpdateConfigEntries = (data) => api.post('/config/entries/bulk', data);

// ============================================
// FEATURE FLAGS
// ============================================

export const getFeatureFlags = (params) => api.get('/config/features', { params });
export const getFeatureFlag = (id) => api.get(`/config/features/${id}`);
export const createFeatureFlag = (data) => api.post('/config/features', data);
export const updateFeatureFlag = (id, data) => api.put(`/config/features/${id}`, data);
export const deleteFeatureFlag = (id) => api.delete(`/config/features/${id}`);
export const toggleFeatureFlag = (id) => api.post(`/config/features/${id}/toggle`);
export const checkFeatureFlag = (key, params) => api.get(`/config/features/check/${key}`, { params });

// ============================================
// REFERENCE DATA
// ============================================

export const getReferenceData = (params) => api.get('/config/reference', { params });
export const getReferenceTypes = () => api.get('/config/reference/types');
export const getReferenceDataById = (id) => api.get(`/config/reference/${id}`);
export const createReferenceData = (data) => api.post('/config/reference', data);
export const updateReferenceData = (id, data) => api.put(`/config/reference/${id}`, data);
export const deleteReferenceData = (id) => api.delete(`/config/reference/${id}`);

// ============================================
// VEHICLE MASTER DATA
// ============================================

export const getVehicleMasterData = (params) => api.get('/config/vehicle', { params });
export const getVehicleTypes = () => api.get('/config/vehicle/types');
export const getVehicleMakes = () => api.get('/config/vehicle/makes');
export const getVehicleModels = (params) => api.get('/config/vehicle/models', { params });
export const getVehicleMasterDataById = (id) => api.get(`/config/vehicle/${id}`);
export const createVehicleMasterData = (data) => api.post('/config/vehicle', data);
export const updateVehicleMasterData = (id, data) => api.put(`/config/vehicle/${id}`, data);
export const deleteVehicleMasterData = (id) => api.delete(`/config/vehicle/${id}`);

// ============================================
// LOCATION MASTER DATA
// ============================================

export const getLocationMasterData = (params) => api.get('/config/location', { params });
export const getLocationTypes = () => api.get('/config/location/types');
export const getCountries = () => api.get('/config/location/countries');
export const getRegions = (params) => api.get('/config/location/regions', { params });
export const getCities = (params) => api.get('/config/location/cities', { params });
export const createLocationMasterData = (data) => api.post('/config/location', data);
export const updateLocationMasterData = (id, data) => api.put(`/config/location/${id}`, data);
export const deleteLocationMasterData = (id) => api.delete(`/config/location/${id}`);

// ============================================
// COUNTRY CONFIGURATION
// ============================================

export const getCountryConfigs = (params) => api.get('/config/countries', { params });
export const getCountryConfig = (id) => api.get(`/config/countries/${id}`);
export const createCountryConfig = (data) => api.post('/config/countries', data);
export const updateCountryConfig = (id, data) => api.put(`/config/countries/${id}`, data);
export const deleteCountryConfig = (id) => api.delete(`/config/countries/${id}`);

// ============================================
// AUDIT
// ============================================

export const getConfigAuditLogs = (params) => api.get('/config/audit', { params });
export const rollbackConfig = (logId) => api.post(`/config/audit/${logId}/rollback`);

