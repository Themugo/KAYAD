import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const xosApi = axios.create({
  baseURL: `${API_URL}/xos`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// Dashboard
export const getXOSDashboard = () => xosApi.get('/dashboard');
export const getExperienceMetrics = () => xosApi.get('/metrics');

// Experiences
export const getExperiences = (params) => xosApi.get('/experiences', { params });
export const getExperience = (id) => xosApi.get(`/experiences/${id}`);
export const createExperience = (data) => xosApi.post('/experiences', data);
export const updateExperience = (id, data) => xosApi.put(`/experiences/${id}`, data);
export const deleteExperience = (id) => xosApi.delete(`/experiences/${id}`);
export const activateExperience = (id) => xosApi.post(`/experiences/${id}/activate`);
export const deactivateExperience = (id) => xosApi.post(`/experiences/${id}/deactivate`);

// Campaigns
export const getCampaigns = (params) => xosApi.get('/campaigns', { params });
export const getCampaign = (id) => xosApi.get(`/campaigns/${id}`);
export const createCampaign = (data) => xosApi.post('/campaigns', data);
export const updateCampaign = (id, data) => xosApi.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => xosApi.delete(`/campaigns/${id}`);
export const launchCampaign = (id) => xosApi.post(`/campaigns/${id}/launch`);
export const pauseCampaign = (id) => xosApi.post(`/campaigns/${id}/pause`);
export const endCampaign = (id) => xosApi.post(`/campaigns/${id}/end`);

// Audiences
export const getAudiences = (params) => xosApi.get('/audiences', { params });
export const getAudienceSegments = () => xosApi.get('/audiences/segments');
export const createAudience = (data) => xosApi.post('/audiences', data);
export const updateAudience = (id, data) => xosApi.put(`/audiences/${id}`, data);
export const deleteAudience = (id) => xosApi.delete(`/audiences/${id}`);

// Journeys
export const getJourneys = (params) => xosApi.get('/journeys', { params });
export const getJourney = (id) => xosApi.get(`/journeys/${id}`);
export const createJourney = (data) => xosApi.post('/journeys', data);
export const updateJourney = (id, data) => xosApi.put(`/journeys/${id}`, data);
export const deleteJourney = (id) => xosApi.delete(`/journeys/${id}`);
export const activateJourney = (id) => xosApi.post(`/journeys/${id}/activate`);

// Seasonal Themes
export const getSeasonalThemes = (params) => xosApi.get('/themes', { params });
export const getSeasonalThemeTemplates = () => xosApi.get('/themes/templates');
export const createSeasonalTheme = (data) => xosApi.post('/themes', data);
export const updateSeasonalTheme = (id, data) => xosApi.put(`/themes/${id}`, data);
export const deleteSeasonalTheme = (id) => xosApi.delete(`/themes/${id}`);

// Homepage Variants
export const getHomepageVariants = () => xosApi.get('/variants');
export const getHomepageVariantTypes = () => xosApi.get('/variants/types');
export const createHomepageVariant = (data) => xosApi.post('/variants', data);
export const updateHomepageVariant = (id, data) => xosApi.put(`/variants/${id}`, data);
export const deleteHomepageVariant = (id) => xosApi.delete(`/variants/${id}`);

// Navigation Rules
export const getNavigationRules = () => xosApi.get('/navigation-rules');
export const createNavigationRule = (data) => xosApi.post('/navigation-rules', data);
export const updateNavigationRule = (id, data) => xosApi.put(`/navigation-rules/${id}`, data);
export const deleteNavigationRule = (id) => xosApi.delete(`/navigation-rules/${id}`);

// Analytics
export const getExperienceAnalytics = (params) => xosApi.get('/analytics', { params });
export const trackExperienceEvent = (data) => xosApi.post('/analytics/track', data);

// AI
export const getAIRecommendations = () => xosApi.get('/ai/recommendations');

// Resolution
export const resolveExperience = (params) => xosApi.get('/resolve', { params });

export default xosApi;
