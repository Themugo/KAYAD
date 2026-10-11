/**
 * Real backend CMS FAQ client - public, read-only access to the
 * KAYAD help-centre questions via the real, already-existing CMS
 * system (backend/controllers/cmsController.js, mounted at
 * /api/cms/faqs; table public.cms_faqs, RLS public-read). Staff
 * edits land here without a frontend deploy. Following the same
 * fetch-client pattern already established in cmsContentApi.ts.
 */

import { request } from '../api/httpRequest';

export interface CMSFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  popularity: number;
  relatedQuestions: string[];
  /** Primary call-to-action for this answer; null when the question has none. */
  nextStep: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CMSFaqResponse {
  data: CMSFaqItem[];
}

/** GET /api/cms/faqs - public, every row (the table holds only
 * published help copy; there is no draft/live split for FAQs).
 * Sorted by the backend on popularity, so the most-opened answers
 * lead by default. Returns [] on any failure so callers can fall
 * back to a bundled default set rather than showing an error for
 * a non-critical, read-only list. */
export async function getCMSFaqs(): Promise<CMSFaqItem[]> {
  try {
    const body = await request<CMSFaqResponse>('/api/cms/faqs?limit=100');
    return body.data || [];
  } catch {
    return [];
  }
}

/** POST /api/cms/faqs/:id/popularity - fire-and-forget. Each
 * expand is a genuine usage signal that feeds back into the same
 * popularity ranking the list already sorts by, so "Popular" and
 * list order are real and move over time instead of being a fixed
 * label. Never surfaced to the visitor and never blocks the UI. */
export function trackFaqOpened(id: string): void {
  if (!id) return;
  void request(`/api/cms/faqs/${encodeURIComponent(id)}/popularity`, { method: 'POST' }).catch(() => {});
}
