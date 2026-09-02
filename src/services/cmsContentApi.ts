/**
 * Real backend CMS content client - read-only, public access to
 * published content (news, buying guides, etc.) via the real,
 * already-existing CMS system (backend/controllers/cmsController.js,
 * mounted at /api/cms/content). Following the same fetch-client
 * pattern already established elsewhere in this project.
 */

import { request } from '../api/httpRequest';

export interface CMSContentItem {
  id: string;
  title: string;
  slug: string;
  content_type: string;
  body?: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  tags?: string[];
  status: string;
  reading_time?: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

interface CMSContentResponse {
  data: CMSContentItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

/** GET /api/cms/content - public, published content only, filtered
 * by real content type (e.g. 'news', 'guide'). */
export async function getCMSContent(contentType: string, limit = 6): Promise<CMSContentItem[]> {
  const params = new URLSearchParams({ contentType, status: 'published', limit: String(limit) });
  try {
    const body = await request<CMSContentResponse>(`/api/cms/content?${params.toString()}`);
    return body.data || [];
  } catch {
    return [];
  }
}
