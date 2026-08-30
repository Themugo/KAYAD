/**
 * Real backend CMS content client - read-only, public access to
 * published content (news, buying guides, etc.) via the real,
 * already-existing CMS system (backend/controllers/cmsController.js,
 * mounted at /api/cms/content). Following the same fetch-client
 * pattern already established elsewhere in this project.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/cms/content?${params.toString()}`);
  } catch {
    return [];
  }
  if (!res.ok) return [];
  try {
    const body: CMSContentResponse = await res.json();
    return body.data || [];
  } catch {
    return [];
  }
}
