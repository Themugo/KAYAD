import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _escrowVaultAPI = {
  init: (carId) => api.post(`/escrow-vault/${carId}/init`).then(unwrap),
  my: () => api.get('/escrow-vault/my').then(unwrap),
  get: (id) => api.get(`/escrow-vault/${id}`).then(unwrap),
  forCar: (carId) => api.get(`/escrow-vault/car/${carId}`).then(unwrap),
  markInspection: (id) => api.post(`/escrow-vault/${id}/inspection-complete`).then(unwrap),
  requestOtp: (id) => api.post(`/escrow-vault/${id}/request-otp`).then(unwrap),
  release: (id, otp) => api.post(`/escrow-vault/${id}/release`, { otp }).then(unwrap),
  webhookFunded: (id, body) => api.post(`/escrow-vault/webhook/${id}/funded`, body).then(unwrap),
  adminAll: () => api.get('/escrow-vault/admin/all').then(unwrap),
  adminConfirm: (id) => api.post(`/escrow-vault/${id}/admin-confirm-funding`).then(unwrap),
  adminRefund: (id) => api.post(`/escrow-vault/${id}/admin-refund`).then(unwrap),
};
export const escrowVaultAPI = withDemo(_escrowVaultAPI, demoAPI.escrowVault);
