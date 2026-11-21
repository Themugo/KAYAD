import { api } from '../api/httpClient';


// ============================================
// DASHBOARD & STATS
// ============================================

export const getPlatformStats = () => api.get('/lowcode/stats');
export const getFieldTypes = () => api.get('/lowcode/field-types');

// ============================================
// BUSINESS OBJECTS
// ============================================

export const getBusinessObjects = (params) => api.get('/lowcode/objects', { params });
export const getBusinessObject = (id) => api.get(`/lowcode/objects/${id}`);
export const createBusinessObject = (data) => api.post('/lowcode/objects', data);
export const updateBusinessObject = (id, data) => api.put(`/lowcode/objects/${id}`, data);
export const deleteBusinessObject = (id) => api.delete(`/lowcode/objects/${id}`);
export const publishBusinessObject = (id) => api.post(`/lowcode/objects/${id}/publish`);
export const cloneBusinessObject = (id) => api.post(`/lowcode/objects/${id}/clone`);
export const generateApi = (id) => api.get(`/lowcode/objects/${id}/api`);

// ============================================
// OBJECT FIELDS
// ============================================

export const getObjectFields = (objectId) => api.get(`/lowcode/objects/${objectId}/fields`);
export const createObjectField = (objectId, data) => api.post(`/lowcode/objects/${objectId}/fields`, data);
export const updateObjectField = (id, data) => api.put(`/lowcode/fields/${id}`, data);
export const deleteObjectField = (id) => api.delete(`/lowcode/fields/${id}`);
export const reorderObjectFields = (objectId, data) => api.post(`/lowcode/objects/${objectId}/fields/reorder`, data);

// ============================================
// RELATIONSHIPS
// ============================================

export const getObjectRelationships = (objectId) => api.get(`/lowcode/objects/${objectId}/relationships`);
export const createObjectRelationship = (data) => api.post('/lowcode/relationships', data);
export const updateObjectRelationship = (id, data) => api.put(`/lowcode/relationships/${id}`, data);
export const deleteObjectRelationship = (id) => api.delete(`/lowcode/relationships/${id}`);

// ============================================
// FORM DEFINITIONS
// ============================================

export const getFormDefinitions = (objectId) => api.get(`/lowcode/objects/${objectId}/forms`);
export const createFormDefinition = (data) => api.post('/lowcode/forms', data);
export const updateFormDefinition = (id, data) => api.put(`/lowcode/forms/${id}`, data);
export const deleteFormDefinition = (id) => api.delete(`/lowcode/forms/${id}`);

// ============================================
// VIEW DEFINITIONS
// ============================================

export const getViewDefinitions = (objectId) => api.get(`/lowcode/objects/${objectId}/views`);
export const createViewDefinition = (data) => api.post('/lowcode/views', data);
export const updateViewDefinition = (id, data) => api.put(`/lowcode/views/${id}`, data);
export const deleteViewDefinition = (id) => api.delete(`/lowcode/views/${id}`);

// ============================================
// PERMISSIONS
// ============================================

export const getObjectPermissions = (objectId) => api.get(`/lowcode/objects/${objectId}/permissions`);
export const updateObjectPermissions = (objectId, data) => api.put(`/lowcode/objects/${objectId}/permissions`, data);

// ============================================
// CUSTOM DASHBOARDS
// ============================================

export const getCustomDashboards = () => api.get('/lowcode/dashboards');
export const createCustomDashboard = (data) => api.post('/lowcode/dashboards', data);
export const updateCustomDashboard = (id, data) => api.put(`/lowcode/dashboards/${id}`, data);
export const deleteCustomDashboard = (id) => api.delete(`/lowcode/dashboards/${id}`);

// ============================================
// VERSIONS
// ============================================

export const getObjectVersions = (objectId) => api.get(`/lowcode/objects/${objectId}/versions`);
export const rollbackObjectVersion = (versionId) => api.post(`/lowcode/versions/${versionId}/rollback`);

// ============================================
// AI ASSISTANT
// ============================================

export const suggestBusinessObject = (data) => api.post('/lowcode/ai/suggest', data);

