import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const lowCodeApi = axios.create({
  baseURL: `${API_URL}/lowcode`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// ============================================
// DASHBOARD & STATS
// ============================================

export const getPlatformStats = () => lowCodeApi.get('/stats');
export const getFieldTypes = () => lowCodeApi.get('/field-types');

// ============================================
// BUSINESS OBJECTS
// ============================================

export const getBusinessObjects = (params) => lowCodeApi.get('/objects', { params });
export const getBusinessObject = (id) => lowCodeApi.get(`/objects/${id}`);
export const createBusinessObject = (data) => lowCodeApi.post('/objects', data);
export const updateBusinessObject = (id, data) => lowCodeApi.put(`/objects/${id}`, data);
export const deleteBusinessObject = (id) => lowCodeApi.delete(`/objects/${id}`);
export const publishBusinessObject = (id) => lowCodeApi.post(`/objects/${id}/publish`);
export const cloneBusinessObject = (id) => lowCodeApi.post(`/objects/${id}/clone`);
export const generateApi = (id) => lowCodeApi.get(`/objects/${id}/api`);

// ============================================
// OBJECT FIELDS
// ============================================

export const getObjectFields = (objectId) => lowCodeApi.get(`/objects/${objectId}/fields`);
export const createObjectField = (objectId, data) => lowCodeApi.post(`/objects/${objectId}/fields`, data);
export const updateObjectField = (id, data) => lowCodeApi.put(`/fields/${id}`, data);
export const deleteObjectField = (id) => lowCodeApi.delete(`/fields/${id}`);
export const reorderObjectFields = (objectId, data) => lowCodeApi.post(`/objects/${objectId}/fields/reorder`, data);

// ============================================
// RELATIONSHIPS
// ============================================

export const getObjectRelationships = (objectId) => lowCodeApi.get(`/objects/${objectId}/relationships`);
export const createObjectRelationship = (data) => lowCodeApi.post('/relationships', data);
export const updateObjectRelationship = (id, data) => lowCodeApi.put(`/relationships/${id}`, data);
export const deleteObjectRelationship = (id) => lowCodeApi.delete(`/relationships/${id}`);

// ============================================
// FORM DEFINITIONS
// ============================================

export const getFormDefinitions = (objectId) => lowCodeApi.get(`/objects/${objectId}/forms`);
export const createFormDefinition = (data) => lowCodeApi.post('/forms', data);
export const updateFormDefinition = (id, data) => lowCodeApi.put(`/forms/${id}`, data);
export const deleteFormDefinition = (id) => lowCodeApi.delete(`/forms/${id}`);

// ============================================
// VIEW DEFINITIONS
// ============================================

export const getViewDefinitions = (objectId) => lowCodeApi.get(`/objects/${objectId}/views`);
export const createViewDefinition = (data) => lowCodeApi.post('/views', data);
export const updateViewDefinition = (id, data) => lowCodeApi.put(`/views/${id}`, data);
export const deleteViewDefinition = (id) => lowCodeApi.delete(`/views/${id}`);

// ============================================
// PERMISSIONS
// ============================================

export const getObjectPermissions = (objectId) => lowCodeApi.get(`/objects/${objectId}/permissions`);
export const updateObjectPermissions = (objectId, data) => lowCodeApi.put(`/objects/${objectId}/permissions`, data);

// ============================================
// CUSTOM DASHBOARDS
// ============================================

export const getCustomDashboards = () => lowCodeApi.get('/dashboards');
export const createCustomDashboard = (data) => lowCodeApi.post('/dashboards', data);
export const updateCustomDashboard = (id, data) => lowCodeApi.put(`/dashboards/${id}`, data);
export const deleteCustomDashboard = (id) => lowCodeApi.delete(`/dashboards/${id}`);

// ============================================
// VERSIONS
// ============================================

export const getObjectVersions = (objectId) => lowCodeApi.get(`/objects/${objectId}/versions`);
export const rollbackObjectVersion = (versionId) => lowCodeApi.post(`/versions/${versionId}/rollback`);

// ============================================
// AI ASSISTANT
// ============================================

export const suggestBusinessObject = (data) => lowCodeApi.post('/ai/suggest', data);

export default lowCodeApi;
