import { api, unwrap, withDemo } from './core';
import { demoAPI } from '../data/demoAPI';

const _paymentsAPI = {
  initiate: (body) => api.post('/payments/initiate', body, { timeout: 45000 }).then(unwrap),
  status: (id) => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments: () => api.get('/payments/my').then(unwrap),
  byCheckout: (checkoutId) => api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
};
export const paymentsAPI = withDemo(_paymentsAPI, demoAPI.payments);
