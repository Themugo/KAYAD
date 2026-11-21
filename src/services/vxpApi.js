import { api } from '../api/httpClient';


// Dashboard
export const getVXPStats = () => api.get('/vxp/stats');

// Pages
export const getPages = (params) => api.get('/vxp/pages', { params });
export const getPage = (id) => api.get(`/vxp/pages/${id}`);
export const createPage = (data) => api.post('/vxp/pages', data);
export const updatePage = (id, data) => api.put(`/vxp/pages/${id}`, data);
export const deletePage = (id) => api.delete(`/vxp/pages/${id}`);
export const publishPage = (id) => api.post(`/vxp/pages/${id}/publish`);
export const duplicatePage = (id) => api.post(`/vxp/pages/${id}/duplicate`);

// Sections
export const getSections = (params) => api.get('/vxp/sections', { params });
export const getSectionTemplates = () => api.get('/vxp/sections/templates');
export const createSection = (data) => api.post('/vxp/sections', data);
export const updateSection = (id, data) => api.put(`/vxp/sections/${id}`, data);
export const deleteSection = (id) => api.delete(`/vxp/sections/${id}`);
export const reorderSections = (data) => api.post('/vxp/sections/reorder', data);

// Components
export const getComponents = (params) => api.get('/vxp/components', { params });
export const getComponentLibrary = () => api.get('/vxp/components/library');
export const createComponent = (data) => api.post('/vxp/components', data);
export const updateComponent = (id, data) => api.put(`/vxp/components/${id}`, data);
export const deleteComponent = (id) => api.delete(`/vxp/components/${id}`);

// Themes
export const getThemes = (params) => api.get('/vxp/themes', { params });
export const getTheme = (id) => api.get(`/vxp/themes/${id}`);
export const getDefaultTheme = () => api.get('/vxp/themes/default');
export const createTheme = (data) => api.post('/vxp/themes', data);
export const updateTheme = (id, data) => api.put(`/vxp/themes/${id}`, data);
export const deleteTheme = (id) => api.delete(`/vxp/themes/${id}`);

// Cards
export const getCards = (params) => api.get('/vxp/cards', { params });
export const getCardFields = () => api.get('/vxp/cards/fields');
export const createCard = (data) => api.post('/vxp/cards', data);
export const updateCard = (id, data) => api.put(`/vxp/cards/${id}`, data);
export const deleteCard = (id) => api.delete(`/vxp/cards/${id}`);

// Advertisements
export const getAdvertisements = (params) => api.get('/vxp/advertisements', { params });
export const getAdZones = () => api.get('/vxp/advertisements/zones');
export const createAdvertisement = (data) => api.post('/vxp/advertisements', data);
export const updateAdvertisement = (id, data) => api.put(`/vxp/advertisements/${id}`, data);
export const deleteAdvertisement = (id) => api.delete(`/vxp/advertisements/${id}`);

// Versions
export const getVersions = (params) => api.get('/vxp/versions', { params });
export const rollbackVersion = (id) => api.post(`/vxp/versions/${id}/rollback`);

// AI
export const aiDesignAssist = (data) => api.post('/vxp/ai/design', data);

