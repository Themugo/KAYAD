import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const vxpApi = axios.create({
  baseURL: `${API_URL}/vxp`,
  headers: {
    'Content-Type': 'application/json',
  },
});

vxpApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard
export const getVXPStats = () => vxpApi.get('/stats');

// Pages
export const getPages = (params) => vxpApi.get('/pages', { params });
export const getPage = (id) => vxpApi.get(`/pages/${id}`);
export const createPage = (data) => vxpApi.post('/pages', data);
export const updatePage = (id, data) => vxpApi.put(`/pages/${id}`, data);
export const deletePage = (id) => vxpApi.delete(`/pages/${id}`);
export const publishPage = (id) => vxpApi.post(`/pages/${id}/publish`);
export const duplicatePage = (id) => vxpApi.post(`/pages/${id}/duplicate`);

// Sections
export const getSections = (params) => vxpApi.get('/sections', { params });
export const getSectionTemplates = () => vxpApi.get('/sections/templates');
export const createSection = (data) => vxpApi.post('/sections', data);
export const updateSection = (id, data) => vxpApi.put(`/sections/${id}`, data);
export const deleteSection = (id) => vxpApi.delete(`/sections/${id}`);
export const reorderSections = (data) => vxpApi.post('/sections/reorder', data);

// Components
export const getComponents = (params) => vxpApi.get('/components', { params });
export const getComponentLibrary = () => vxpApi.get('/components/library');
export const createComponent = (data) => vxpApi.post('/components', data);
export const updateComponent = (id, data) => vxpApi.put(`/components/${id}`, data);
export const deleteComponent = (id) => vxpApi.delete(`/components/${id}`);

// Themes
export const getThemes = (params) => vxpApi.get('/themes', { params });
export const getTheme = (id) => vxpApi.get(`/themes/${id}`);
export const getDefaultTheme = () => vxpApi.get('/themes/default');
export const createTheme = (data) => vxpApi.post('/themes', data);
export const updateTheme = (id, data) => vxpApi.put(`/themes/${id}`, data);
export const deleteTheme = (id) => vxpApi.delete(`/themes/${id}`);

// Cards
export const getCards = (params) => vxpApi.get('/cards', { params });
export const getCardFields = () => vxpApi.get('/cards/fields');
export const createCard = (data) => vxpApi.post('/cards', data);
export const updateCard = (id, data) => vxpApi.put(`/cards/${id}`, data);
export const deleteCard = (id) => vxpApi.delete(`/cards/${id}`);

// Advertisements
export const getAdvertisements = (params) => vxpApi.get('/advertisements', { params });
export const getAdZones = () => vxpApi.get('/advertisements/zones');
export const createAdvertisement = (data) => vxpApi.post('/advertisements', data);
export const updateAdvertisement = (id, data) => vxpApi.put(`/advertisements/${id}`, data);
export const deleteAdvertisement = (id) => vxpApi.delete(`/advertisements/${id}`);

// Versions
export const getVersions = (params) => vxpApi.get('/versions', { params });
export const rollbackVersion = (id) => vxpApi.post(`/versions/${id}/rollback`);

// AI
export const aiDesignAssist = (data) => vxpApi.post('/ai/design', data);

export default vxpApi;
