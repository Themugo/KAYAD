import { api } from '../api/httpClient';


// Dashboard
export const getPlatformDashboard = () => api.get('/platform-factory/dashboard');

// Templates
export const getTemplates = () => api.get('/platform-factory/templates');
export const getTemplateDetails = (templateId) => api.get(`/platform-factory/templates/${templateId}`);

// Generator
export const generateProduct = (data) => api.post('/platform-factory/generate', data);
export const getGenerationStatus = (productId) => api.get(`/platform-factory/generate/${productId}/status`);

// Products
export const getProducts = () => api.get('/platform-factory/products');
export const getProductDetails = (productId) => api.get(`/platform-factory/products/${productId}`);
export const updateProduct = (productId, data) => api.put(`/platform-factory/products/${productId}`, data);
export const deleteProduct = (productId) => api.delete(`/platform-factory/products/${productId}`);

// Components
export const getComponents = (category) => api.get('/platform-factory/components', { params: { category } });

// Domain Models
export const getDomainModels = () => api.get('/platform-factory/domain-models');

// Shared Services
export const getSharedServices = () => api.get('/platform-factory/services');

// White Label
export const getBrands = () => api.get('/platform-factory/brands');
export const getBrandDetails = (brandId) => api.get(`/platform-factory/brands/${brandId}`);
export const updateBrand = (brandId, data) => api.put(`/platform-factory/brands/${brandId}`, data);

// Deployment
export const getDeployments = (productId) => api.get('/platform-factory/deployments', { params: { productId } });
export const deployProduct = (data) => api.post('/platform-factory/deploy', data);
export const rollbackDeployment = (deploymentId) => api.post(`/platform-factory/deployments/${deploymentId}/rollback`);

// App Store
export const getAppStore = () => api.get('/platform-factory/store');
export const installApp = (data) => api.post('/platform-factory/store/install', data);

// AI Designer
export const designProduct = (data) => api.post('/platform-factory/design', data);
export const getDesignStatus = (designId) => api.get(`/platform-factory/design/${designId}/status`);

// Monetization
export const getMonetizationOptions = () => api.get('/platform-factory/monetization');
export const configureMonetization = (data) => api.post('/platform-factory/monetization/configure', data);

// Platform Health
export const getPlatformHealth = () => api.get('/platform-factory/health');

// Workflows
export const getWorkflows = () => api.get('/platform-factory/workflows');

