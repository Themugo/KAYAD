import HeroPlacement from '../models/HeroPlacement.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { findById, findAll, update } from '../db/index.js';

const DEFAULT_COMMERCIAL = {
  enabled: true,
  rotationMode: 'equal',
  defaultSlotSeconds: 15,
  packages: [
    { id: 'hero-15', label: '15-second Hero Spotlight', seconds: 15, price: 2500 },
    { id: 'hero-30', label: '30-second Hero Spotlight', seconds: 30, price: 4500 },
    { id: 'hero-60', label: '60-second Hero Spotlight', seconds: 60, price: 8000 },
  ],
};

function mergeCommercial(value) {
  const source = value && typeof value === 'object' ? value : {};
  const packages = Array.isArray(source.packages) && source.packages.length ? source.packages : DEFAULT_COMMERCIAL.packages;
  return {
    ...DEFAULT_COMMERCIAL,
    ...source,
    rotationMode: source.rotationMode === 'custom' ? 'custom' : 'equal',
    defaultSlotSeconds: Math.max(5, Math.min(300, Number(source.defaultSlotSeconds) || 15)),
    packages: packages.map((p, i) => ({
      id: String(p?.id || `hero-${i + 1}`),
      label: String(p?.label || `Hero Spotlight ${i + 1}`),
      seconds: Math.max(5, Math.min(300, Number(p?.seconds) || 15)),
      price: Math.max(0, Number(p?.price) || 0),
    })),
  };
}

export const heroPlacementService = {
  async publicConfig() {
    const config = await PlatformConfig.findOne().lean();
    return mergeCommercial(config?.heroCommercial);
  },

  async activePlacements(now = new Date()) {
    const rows = await HeroPlacement.find({ status: { $in: ['scheduled', 'active'] }, assignedStartAt: { $lte: now }, assignedEndAt: { $gt: now } }).sort({ assignedStartAt: 1, createdAt: 1 }).lean();
    return Promise.all(rows.map(async (row) => ({ ...row, vehicle: await findById('cars', row.vehicleId) })));
  },

  async sellerCreate({ sellerId, vehicleId, packageId, requestedStartAt = null, requestedEndAt = null }) {
    const car = await findById('cars', vehicleId);
    if (!car) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
    const owner = car.dealer?.id || car.dealer?._id || car.dealer?.toString?.() || car.dealer;
    if (owner !== sellerId) throw Object.assign(new Error('You can only promote your own vehicle'), { status: 403 });

    const config = await this.publicConfig();
    const pack = config.packages.find((p) => p.id === packageId);
    if (!pack) throw Object.assign(new Error('Hero package is no longer available'), { status: 400 });

    const row = await HeroPlacement.create({
      vehicleId,
      sellerId,
      packageId: pack.id,
      slotSeconds: pack.seconds,
      price: pack.price,
      currency: 'KES',
      requestedStartAt,
      requestedEndAt,
      status: 'pending_payment',
    });
    return row;
  },

  async listMine(sellerId) {
    return HeroPlacement.find({ sellerId }).sort({ createdAt: -1 }).lean();
  },

  async adminList() {
    return HeroPlacement.find({}).sort({ assignedStartAt: 1, createdAt: -1 }).lean();
  },

  async adminSchedule(id, { assignedStartAt, assignedEndAt, status = 'scheduled', adminNote = '' }) {
    const row = await HeroPlacement.findById(id);
    if (!row) throw Object.assign(new Error('Hero placement not found'), { status: 404 });
    row.assignedStartAt = assignedStartAt || row.assignedStartAt;
    row.assignedEndAt = assignedEndAt || row.assignedEndAt;
    if (status === 'scheduled' && row.assignedStartAt && row.assignedEndAt) {
      const conflicts = await HeroPlacement.find({
        id: { $ne: id },
        status: { $in: ['scheduled', 'active'] },
        assignedStartAt: { $lt: row.assignedEndAt },
        assignedEndAt: { $gt: row.assignedStartAt },
      }).lean();
      if (conflicts.length >= 2) throw Object.assign(new Error('Both premium hero positions are already booked for this time window'), { status: 409 });
    }
    row.status = status;
    row.adminNote = adminNote;
    return row.save();
  },

  async markPaid(paymentId, placementId) {
    const row = await HeroPlacement.findById(placementId);
    if (!row) return null;
    if (row.paymentId && row.paymentId !== paymentId) return row;
    row.paymentId = paymentId;
    row.status = 'pending_review';
    return row.save();
  },
};

export { DEFAULT_COMMERCIAL };
