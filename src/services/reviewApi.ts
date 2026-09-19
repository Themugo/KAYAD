import { request } from '../api/httpRequest';

export interface CreateReviewInput {
  dealer: string;
  carId?: string;
  rating: number;
  comment: string;
}

export const createReview = (input: CreateReviewInput) =>
  request('/reviews', { method: 'POST', body: input });

export const getDealerReviews = (dealerId: string, params: Record<string, unknown> = {}) =>
  request(`/reviews/dealer/${dealerId}`, { method: 'GET', params });

export const getMyReviews = (params: Record<string, unknown> = {}) =>
  request('/reviews/my', { method: 'GET', params });

export const deleteReview = (id: string) =>
  request(`/reviews/${id}`, { method: 'DELETE' });
