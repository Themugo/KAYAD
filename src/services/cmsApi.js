import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const cmsApi = axios.create({
  baseURL: `${API_URL}/cms`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
cmsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// PAGES
// ============================================

export const getPages = (params = {}) => cmsApi.get('/pages', { params });
export const getPageById = (id) => cmsApi.get(`/pages/${id}`);
export const getPageBySlug = (slug) => cmsApi.get(`/pages/s/${slug}`);
export const createPage = (data) => cmsApi.post('/pages', data);
export const updatePage = (id, data) => cmsApi.put(`/pages/${id}`, data);
export const deletePage = (id) => cmsApi.delete(`/pages/${id}`);
export const publishPage = (id) => cmsApi.post(`/pages/${id}/publish`);
export const unpublishPage = (id) => cmsApi.post(`/pages/${id}/unpublish`);
export const schedulePage = (id, scheduleAt) => cmsApi.post(`/pages/${id}/schedule`, { scheduleAt });
export const rollbackPage = (id, version) => cmsApi.post(`/pages/${id}/rollback`, { version });

// ============================================
// CONTENT (BLOG / NEWS)
// ============================================

export const getContents = (params = {}) => cmsApi.get('/content', { params });
export const getContentById = (id) => cmsApi.get(`/content/${id}`);
export const getContentBySlug = (slug) => cmsApi.get(`/content/s/${slug}`);
export const createContent = (data) => cmsApi.post('/content', data);
export const updateContent = (id, data) => cmsApi.put(`/content/${id}`, data);
export const deleteContent = (id) => cmsApi.delete(`/content/${id}`);

// ============================================
// FAQS
// ============================================

export const getFaqs = (params = {}) => cmsApi.get('/faqs', { params });
export const getFaqById = (id) => cmsApi.get(`/faqs/${id}`);
export const createFaq = (data) => cmsApi.post('/faqs', data);
export const updateFaq = (id, data) => cmsApi.put(`/faqs/${id}`, data);
export const deleteFaq = (id) => cmsApi.delete(`/faqs/${id}`);
export const incrementFaqPopularity = (id) => cmsApi.post(`/faqs/${id}/popularity`);

// ============================================
// CAMPAIGNS
// ============================================

export const getCampaigns = (params = {}) => cmsApi.get('/campaigns', { params });
export const getCampaignById = (id) => cmsApi.get(`/campaigns/${id}`);
export const createCampaign = (data) => cmsApi.post('/campaigns', data);
export const updateCampaign = (id, data) => cmsApi.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => cmsApi.delete(`/campaigns/${id}`);

// ============================================
// BANNERS
// ============================================

export const getBanners = (params = {}) => cmsApi.get('/banners', { params });
export const getBannerById = (id) => cmsApi.get(`/banners/${id}`);
export const createBanner = (data) => cmsApi.post('/banners', data);
export const updateBanner = (id, data) => cmsApi.put(`/banners/${id}`, data);
export const deleteBanner = (id) => cmsApi.delete(`/banners/${id}`);
export const reorderBanners = (banners) => cmsApi.post('/banners/reorder', { banners });

// ============================================
// MEDIA LIBRARY
// ============================================

export const getMedia = (params = {}) => cmsApi.get('/media', { params });
export const getMediaById = (id) => cmsApi.get(`/media/${id}`);
export const uploadMedia = (data) => cmsApi.post('/media', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateMedia = (id, data) => cmsApi.put(`/media/${id}`, data);
export const deleteMedia = (id) => cmsApi.delete(`/media/${id}`);

// ============================================
// TAXONOMIES (Categories & Tags)
// ============================================

export const getTaxonomies = (type) => cmsApi.get('/taxonomies', { type });
export const createTaxonomy = (data) => cmsApi.post('/taxonomies', data);
export const updateTaxonomy = (id, data) => cmsApi.put(`/taxonomies/${id}`, data);
export const deleteTaxonomy = (id) => cmsApi.delete(`/taxonomies/${id}`);

// ============================================
// REVISIONS
// ============================================

export const getRevisions = (contentId, contentType) => 
  cmsApi.get('/revisions', { params: { contentId, contentType } });
export const getRevisionById = (id) => cmsApi.get(`/revisions/${id}`);

// ============================================
// A/B TESTS
// ============================================

export const getABTests = (status) => cmsApi.get('/ab-tests', { status });
export const createABTest = (data) => cmsApi.post('/ab-tests', data);
export const updateABTest = (id, data) => cmsApi.put(`/ab-tests/${id}`, data);
export const deleteABTest = (id) => cmsApi.delete(`/ab-tests/${id}`);

// ============================================
// ANALYTICS
// ============================================

export const trackAnalytics = (data) => cmsApi.post('/analytics/track', data);
export const getAnalytics = (params) => cmsApi.get('/analytics', { params });
export const getContentAnalytics = (contentId) => cmsApi.get(`/analytics/content/${contentId}`);
export const getDashboardStats = () => cmsApi.get('/dashboard/stats');

// ============================================
// PUBLISHING CALENDAR & SEARCH
// ============================================

export const getPublishingCalendar = (startDate, endDate) =>
  cmsApi.get('/calendar', { params: { startDate, endDate } });
export const searchContent = (q, type) =>
  cmsApi.get('/search', { params: { q, type } });

export default cmsApi;
