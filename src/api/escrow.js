import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _escrowAPI = {
  mine: () => api.get('/escrow/my').then(unwrap),
  all: (params) => api.get('/escrow', { params }).then(unwrap),
  get: (id) => api.get(`/escrow/${id}`).then(unwrap),
  release: (id) => api.post(`/escrow/${id}/release`).then(unwrap),
  refund: (id) => api.post(`/escrow/${id}/refund`).then(unwrap),
  dispute: (id, reason) => api.post(`/escrow/${id}/dispute`, { reason }).then(unwrap),
  requestRelease: (id) => api.post(`/escrow/${id}/request-release`).then(unwrap),
};
export const escrowAPI = withDemo(_escrowAPI, demoAPI.escrow);
