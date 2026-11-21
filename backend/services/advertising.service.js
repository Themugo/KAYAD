import AdSlot from '../models/AdSlot.js';

const VALID_PLACEMENTS = ['top_ticker', 'left_rail', 'right_rail', 'mid_grid', 'sidebar'];
const ACTIVE_STATUSES = ['active'];

function isCurrentlyActive(ad) {
  if (!ad?.isVisible) return false;
  if (ad.status && !ACTIVE_STATUSES.includes(ad.status)) return false;
  const now = Date.now();
  if (ad.startAt && new Date(ad.startAt).getTime() > now) return false;
  if (ad.endAt && new Date(ad.endAt).getTime() <= now) return false;
  return true;
}

const ALLOWED_FIELDS = new Set([
  'placement', 'title', 'tagline', 'priceTag', 'buttonText', 'buttonUrl',
  'backgroundColor', 'textColor', 'opacity', 'displayMode',
  'scrollDurationSeconds', 'fadeDurationMs', 'sortOrder', 'isVisible',
  'status', 'startAt', 'endAt',
]);

function normalizeInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Ad configuration must be an object');
  }
  const unknown = Object.keys(input).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknown.length) throw new Error(`Unsupported ad field: ${unknown[0]}`);

  const output = { ...input };
  if (output.placement !== undefined && !VALID_PLACEMENTS.includes(output.placement)) throw new Error('Invalid placement');
  for (const key of ['title', 'tagline', 'priceTag', 'buttonText', 'buttonUrl']) {
    if (output[key] !== undefined) {
      if (typeof output[key] !== 'string') throw new Error(`${key} must be text`);
      output[key] = output[key].trim();
      const limits = { title: 120, tagline: 240, priceTag: 80, buttonText: 50, buttonUrl: 2048 };
      if (output[key].length > limits[key]) throw new Error(`${key} must be ${limits[key]} characters or fewer`);
      if (key === 'title' && !output[key]) throw new Error('Title is required');
    }
  }
  if (output.buttonUrl) {
    let parsed;
    try { parsed = new URL(output.buttonUrl); } catch { throw new Error('Destination URL is invalid'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('Destination URL must use http or https');
    }
  }
  for (const key of ['backgroundColor', 'textColor']) {
    if (output[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(String(output[key]))) {
      throw new Error(`${key} must be a six-digit hex color`);
    }
  }
  if (output.opacity !== undefined) {
    output.opacity = Number(output.opacity);
    if (!Number.isFinite(output.opacity) || output.opacity < 0 || output.opacity > 100) throw new Error('Opacity must be between 0 and 100');
  }
  if (output.displayMode !== undefined && !['scroll', 'fade'].includes(output.displayMode)) throw new Error('Invalid display mode');
  if (output.scrollDurationSeconds !== undefined) {
    output.scrollDurationSeconds = Number(output.scrollDurationSeconds);
    if (!Number.isInteger(output.scrollDurationSeconds) || output.scrollDurationSeconds < 10 || output.scrollDurationSeconds > 120) throw new Error('Scroll duration must be between 10 and 120 seconds');
  }
  if (output.fadeDurationMs !== undefined) {
    output.fadeDurationMs = Number(output.fadeDurationMs);
    if (!Number.isInteger(output.fadeDurationMs) || output.fadeDurationMs < 1200 || output.fadeDurationMs > 15000) throw new Error('Fade duration must be between 1200 and 15000 milliseconds');
  }
  if (output.sortOrder !== undefined) {
    output.sortOrder = Number(output.sortOrder);
    if (!Number.isInteger(output.sortOrder) || output.sortOrder < 0 || output.sortOrder > 100000) throw new Error('sortOrder must be an integer between 0 and 100000');
  }
  if (output.isVisible !== undefined && typeof output.isVisible !== 'boolean') throw new Error('isVisible must be a boolean');
  if (output.status !== undefined && !['active', 'paused', 'draft', 'expired'].includes(output.status)) throw new Error('Invalid ad status');
  for (const key of ['startAt', 'endAt']) {
    if (output[key] !== undefined && output[key] !== null) {
      const date = new Date(output[key]);
      if (Number.isNaN(date.getTime())) throw new Error(`${key} must be a valid date`);
      output[key] = date;
    }
  }
  const startAt = output.startAt;
  const endAt = output.endAt;
  if (startAt && endAt && new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new Error('Ad end date must be after its start date');
  }
  return output;
}

export const advertisingService = {
  placements: VALID_PLACEMENTS,

  async listPublic(placement) {
    if (placement && !VALID_PLACEMENTS.includes(placement)) throw new Error('Invalid placement');
    const filters = { isVisible: true, status: 'active' };
    if (placement) filters.placement = placement;
    const rows = await AdSlot.find(filters).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return rows.filter(isCurrentlyActive);
  },

  async listAdmin() {
    return AdSlot.find({}).sort({ placement: 1, sortOrder: 1, createdAt: -1 }).lean();
  },

  async create(input, actorId) {
    const data = normalizeInput(input);
    return AdSlot.create({
      ...data,
      status: data.status || 'active',
      isVisible: data.isVisible !== false,
      backgroundColor: data.backgroundColor || '#0A3340',
      textColor: data.textColor || '#FFFFFF',
      opacity: data.opacity ?? 100,
      sortOrder: data.sortOrder ?? 0,
      displayMode: data.displayMode || 'scroll',
      scrollDurationSeconds: data.scrollDurationSeconds ?? 28,
      fadeDurationMs: data.fadeDurationMs ?? 4500,
      impressions: 0,
      clicks: 0,
      createdBy: actorId,
    });
  },

  async update(id, input) {
    const data = normalizeInput(input);
    if (data.startAt !== undefined || data.endAt !== undefined) {
      const current = await AdSlot.findById(id);
      if (!current) return null;
      const startAt = data.startAt !== undefined ? data.startAt : current.startAt;
      const endAt = data.endAt !== undefined ? data.endAt : current.endAt;
      if (startAt && endAt && new Date(startAt).getTime() >= new Date(endAt).getTime()) {
        throw new Error('Ad end date must be after its start date');
      }
    }
    return AdSlot.findByIdAndUpdate(id, data, { new: true });
  },

  async remove(id) {
    return AdSlot.findByIdAndDelete(id);
  },

  async recordEvent(id, type) {
    if (!['impression', 'click'].includes(type)) throw new Error('Invalid advertising event');
    const ad = await AdSlot.findById(id);
    if (!ad || !isCurrentlyActive(ad)) return null;
    const field = type === 'impression' ? 'impressions' : 'clicks';
    return AdSlot.findByIdAndUpdate(id, { $inc: { [field]: 1 } }, { new: true });
  },

  async stats() {
    const rows = await AdSlot.find({}).lean();
    return rows.map((ad) => {
      const impressions = Number(ad.impressions || 0);
      const clicks = Number(ad.clicks || 0);
      return { id: ad.id, title: ad.title, placement: ad.placement, status: ad.status || 'active', isVisible: !!ad.isVisible, impressions, clicks, ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0 };
    });
  },
};
