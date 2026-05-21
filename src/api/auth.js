import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _authAPI = {
  register: (body) => api.post('/auth/register', body).then(unwrap),
  login: (body) => api.post('/auth/login', body).then(unwrap),
  refresh: () => api.post('/auth/refresh', {}, { withCredentials: true }).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  profile: () => api.get('/auth/profile').then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  changePassword: (body) => api.put('/auth/change-password', body).then(unwrap),
  forgotPassword: (body) => api.post('/auth/forgot-password', body).then(unwrap),
  resetPassword: (body) => api.post('/auth/reset-password', body).then(unwrap),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`).then(unwrap),
  resendVerification: (body) => api.post('/auth/resend-verification', body).then(unwrap),
  updateProfile: (body) => api.put('/auth/profile', body).then(unwrap),
};
export const authAPI = withDemo(_authAPI, demoAPI.auth);
