import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _favoritesAPI = {
  list: () => api.get('/favorites').then(unwrap),
  add: (carId) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
  setPriceAlert: (carId, notify) => api.put(`/favorites/${carId}/price-alert`, { notifyOnPriceDrop: notify }).then(unwrap),
};
export const favoritesAPI = withDemo(_favoritesAPI, demoAPI.favorites);

const _chatAPI = {
  inbox: () => api.get('/chat').then(unwrap),
  start: (body) => api.post('/chat', body).then(unwrap),
  messages: (chatId, params) => api.get(`/chat/${chatId}/messages`, { params }).then(unwrap),
  send: (chatId, body) => api.post(`/chat/${chatId}/message`, body).then(unwrap),
  seen: (chatId) => api.post(`/chat/${chatId}/seen`).then(unwrap),
  leave: (chatId) => api.delete(`/chat/${chatId}`).then(unwrap),
};
export const chatAPI = withDemo(_chatAPI, demoAPI.chat);

const _notifAPI = {
  list: (params) => api.get('/notifications', { params }).then(unwrap),
  markRead: (id) => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.post('/notifications/read-all').then(unwrap),
  remove: (id) => api.delete(`/notifications/${id}`).then(unwrap),
};
export const notifAPI = withDemo(_notifAPI, demoAPI.notif);

const _savedSearchAPI = {
  list: () => api.get('/saved-searches').then(unwrap),
  create: (body) => api.post('/saved-searches', body).then(unwrap),
  update: (id, body) => api.put(`/saved-searches/${id}`, body).then(unwrap),
  remove: (id) => api.delete(`/saved-searches/${id}`).then(unwrap),
};
export const savedSearchAPI = withDemo(_savedSearchAPI, demoAPI.savedSearch);

const _ntsaAPI = {
  list: (params) => api.get('/ntsa-verification', { params }).then(unwrap),
  queue: (carId) => api.post('/ntsa-verification', { carId }).then(unwrap),
  process: (id, body) => api.post(`/ntsa-verification/${id}/process`, body).then(unwrap),
  addDoc: (id, body) => api.post(`/ntsa-verification/${id}/documents`, body).then(unwrap),
  status: (carId) => api.get(`/ntsa-verification/car/${carId}/status`).then(unwrap),
};
export const ntsaAPI = withDemo(_ntsaAPI, demoAPI.ntsa);

const _inspectionAPI = {
  order: (body) => api.post('/inspections/order', body).then(unwrap),
  confirmPayment: (checkoutRequestID) => api.post('/inspections/confirm-payment', { checkoutRequestID }).then(unwrap),
  myOrders: () => api.get('/inspections/my').then(unwrap),
  myTasks: () => api.get('/inspections/my-tasks').then(unwrap),
  list: (params) => api.get('/inspections', { params }).then(unwrap),
  availableInspectors: () => api.get('/inspections/available-inspectors').then(unwrap),
  assign: (id, inspectorId) => api.post(`/inspections/${id}/assign`, { inspectorId }).then(unwrap),
  start: (id) => api.post(`/inspections/${id}/start`).then(unwrap),
  submit: (id, body) => api.post(`/inspections/${id}/submit`, body).then(unwrap),
  get: (id) => api.get(`/inspections/${id}`).then(unwrap),
  forCar: (carId) => api.get(`/inspections/car/${carId}`).then(unwrap),
};
export const inspectionAPI = withDemo(_inspectionAPI, demoAPI.inspection);

const _reviewsAPI = {
  create: (body) => api.post('/reviews', body).then(unwrap),
  mine: () => api.get('/reviews/my').then(unwrap),
  forDealer: (dealerId) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove: (id) => api.delete(`/reviews/${id}`).then(unwrap),
};
export const reviewsAPI = withDemo(_reviewsAPI, demoAPI.reviews);

const _transactionsAPI = {
  list: (params) => api.get('/transactions', { params }).then(unwrap),
  get: (id) => api.get(`/transactions/${id}`).then(unwrap),
  summary: () => api.get('/transactions/summary').then(unwrap),
};
export const transactionsAPI = withDemo(_transactionsAPI, demoAPI.transactions);

const _referralAPI = {
  stats: () => api.get('/referral/stats').then(unwrap),
  code: () => api.get('/referral/code').then(unwrap),
};
export const referralAPI = withDemo(_referralAPI, {});

export const buyerVerificationAPI = {
  submitPreApproval: (body) => api.post('/users/bank-pre-approval', body).then(unwrap),
  removePreApproval: () => api.delete('/users/bank-pre-approval').then(unwrap),
};
