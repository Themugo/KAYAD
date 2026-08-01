import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const platformFactoryApi = axios.create({
  baseURL: `${API_URL}/platform-factory`,
  headers: {
    'Content-Type': 'application/json',
  },
});

platformFactoryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard
export const getPlatformDashboard = () => platformFactoryApi.get('/dashboard');

// Templates
export const getTemplates = () => platformFactoryApi.get('/templates');
export const getTemplateDetails = (templateId) => platformFactoryApi.get(`/templates/${templateId}`);

// Generator
export const generateProduct = (data) => platformFactoryApi.post('/generate', data);
export const getGenerationStatus = (productId) => platformFactoryApi.get(`/generate/${productId}/status`);

// Products
export const getProducts = () => platformFactoryApi.get('/products');
export const getProductDetails = (productId) => platformFactoryApi.get(`/products/${productId}`);
export const updateProduct = (productId, data) => platformFactoryApi.put(`/products/${productId}`, data);
export const deleteProduct = (productId) => platformFactoryApi.delete(`/products/${productId}`);

// Components
export const getComponents = (category) => platformFactoryApi.get('/components', { params: { category } });

// Domain Models
export const getDomainModels = () => platformFactoryApi.get('/domain-models');

// Shared Services
export const getSharedServices = () => platformFactoryApi.get('/services');

// White Label
export const getBrands = () => platformFactoryApi.get('/brands');
export const getBrandDetails = (brandId) => platformFactoryApi.get(`/brands/${brandId}`);
export const updateBrand = (brandId, data) => platformFactoryApi.put(`/brands/${brandId}`, data);

// Deployment
export const getDeployments = (productId) => platformFactoryApi.get('/deployments', { params: { productId } });
export const deployProduct = (data) => platformFactoryApi.post('/deploy', data);
export const rollbackDeployment = (deploymentId) => platformFactoryApi.post(`/deployments/${deploymentId}/rollback`);

// App Store
export const getAppStore = () => platformFactoryApi.get('/store');
export const installApp = (data) => platformFactoryApi.post('/store/install', data);

// AI Designer
export const designProduct = (data) => platformFactoryApi.post('/design', data);
export const getDesignStatus = (designId) => platformFactoryApi.get(`/design/${designId}/status`);

// Monetization
export const getMonetizationOptions = () => platformFactoryApi.get('/monetization');
export const configureMonetization = (data) => platformFactoryApi.post('/monetization/configure', data);

// Platform Health
export const getPlatformHealth = () => platformFactoryApi.get('/health');

// Workflows
export const getWorkflows = () => platformFactoryApi.get('/workflows');

export default platformFactoryApi;
