import { api } from '../api/httpClient';


// Dashboard
export const getXOSDashboard = () => api.get('/xos/dashboard');
export const getExperienceMetrics = () => api.get('/xos/metrics');

// Experiences
export const getExperiences = (params) => api.get('/xos/experiences', { params });
export const getExperience = (id) => api.get(`/xos/experiences/${id}`);
export const createExperience = (data) => api.post('/xos/experiences', data);
export const updateExperience = (id, data) => api.put(`/xos/experiences/${id}`, data);
export const deleteExperience = (id) => api.delete(`/xos/experiences/${id}`);
export const activateExperience = (id) => api.post(`/xos/experiences/${id}/activate`);
export const deactivateExperience = (id) => api.post(`/xos/experiences/${id}/deactivate`);

// Campaigns
export const getCampaigns = (params) => api.get('/xos/campaigns', { params });
export const getCampaign = (id) => api.get(`/xos/campaigns/${id}`);
export const createCampaign = (data) => api.post('/xos/campaigns', data);
export const updateCampaign = (id, data) => api.put(`/xos/campaigns/${id}`, data);
export const deleteCampaign = (id) => api.delete(`/xos/campaigns/${id}`);
export const launchCampaign = (id) => api.post(`/xos/campaigns/${id}/launch`);
export const pauseCampaign = (id) => api.post(`/xos/campaigns/${id}/pause`);
export const endCampaign = (id) => api.post(`/xos/campaigns/${id}/end`);

// Audiences
export const getAudiences = (params) => api.get('/xos/audiences', { params });
export const getAudienceSegments = () => api.get('/xos/audiences/segments');
export const createAudience = (data) => api.post('/xos/audiences', data);
export const updateAudience = (id, data) => api.put(`/xos/audiences/${id}`, data);
export const deleteAudience = (id) => api.delete(`/xos/audiences/${id}`);

// Journeys
export const getJourneys = (params) => api.get('/xos/journeys', { params });
export const getJourney = (id) => api.get(`/xos/journeys/${id}`);
export const createJourney = (data) => api.post('/xos/journeys', data);
export const updateJourney = (id, data) => api.put(`/xos/journeys/${id}`, data);
export const deleteJourney = (id) => api.delete(`/xos/journeys/${id}`);
export const activateJourney = (id) => api.post(`/xos/journeys/${id}/activate`);

// Seasonal Themes
export const getSeasonalThemes = (params) => api.get('/xos/themes', { params });
export const getSeasonalThemeTemplates = () => api.get('/xos/themes/templates');
export const createSeasonalTheme = (data) => api.post('/xos/themes', data);
export const updateSeasonalTheme = (id, data) => api.put(`/xos/themes/${id}`, data);
export const deleteSeasonalTheme = (id) => api.delete(`/xos/themes/${id}`);

// Homepage Variants
export const getHomepageVariants = () => api.get('/xos/variants');
export const getHomepageVariantTypes = () => api.get('/xos/variants/types');
export const createHomepageVariant = (data) => api.post('/xos/variants', data);
export const updateHomepageVariant = (id, data) => api.put(`/xos/variants/${id}`, data);
export const deleteHomepageVariant = (id) => api.delete(`/xos/variants/${id}`);

// Navigation Rules
export const getNavigationRules = () => api.get('/xos/navigation-rules');
export const createNavigationRule = (data) => api.post('/xos/navigation-rules', data);
export const updateNavigationRule = (id, data) => api.put(`/xos/navigation-rules/${id}`, data);
export const deleteNavigationRule = (id) => api.delete(`/xos/navigation-rules/${id}`);

// Analytics
export const getExperienceAnalytics = (params) => api.get('/xos/analytics', { params });
export const trackExperienceEvent = (data) => api.post('/xos/analytics/track', data);

// AI
export const getAIRecommendations = () => api.get('/xos/ai/recommendations');

// Resolution
export const resolveExperience = (params) => api.get('/xos/resolve', { params });

