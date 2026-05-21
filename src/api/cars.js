import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _carsAPI = {
  list: (params) => api.get('/cars', { params }).then(unwrap),
  get: (id) => api.get(`/cars/${id}`).then(unwrap),
  insights: (id) => api.get(`/cars/${id}/insights`).then(unwrap),
  priceHistory: (id) => api.get(`/cars/${id}/price-history`).then(unwrap),
  trackClick: (id) => api.post(`/cars/${id}/click`).then(unwrap),
  create: (formData) => api.post('/cars', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  addImages: (id, formData) => api.post(`/cars/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  deleteImage: (id, idx) => api.delete(`/cars/${id}/images/${idx}`).then(unwrap),
  update: (id, body) => api.put(`/cars/${id}`, body).then(unwrap),
  promote: (id, body) => api.patch(`/cars/${id}/promote`, body).then(unwrap),
  remove: (id) => api.delete(`/cars/${id}`).then(unwrap),
  myCars: () => api.get('/cars/dealer/my-cars').then(unwrap),
  analytics: () => api.get('/cars/dealer/analytics').then(unwrap),
  bid: (id, body) => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id) => api.post(`/cars/${id}/favorite`).then(unwrap),
  batch: (body) => api.post('/cars/batch', body).then(unwrap),
  demoAll: () => api.get('/cars/demo/all').then(unwrap),
  fraudCheck: (id) => api.get(`/cars/admin/${id}/fraud`).then(unwrap),
  adminStart: (id) => api.post(`/cars/admin/${id}/start`).then(unwrap),
  adminEnd: (id) => api.post(`/cars/admin/${id}/end`).then(unwrap),
};
export const carsAPI = withDemo(_carsAPI, demoAPI.cars);
