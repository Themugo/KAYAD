import { heroPlacementService } from '../services/heroPlacement.service.js';
import { initiatePayment } from '../services/paymentService.js';

export async function getPublicHeroCommercial(req, res) {
  res.json({ success: true, config: await heroPlacementService.publicConfig() });
}

export async function getActiveHeroPlacements(req, res) {
  res.json({ success: true, data: await heroPlacementService.activePlacements() });
}

export async function listMyHeroPlacements(req, res) {
  res.json({ success: true, data: await heroPlacementService.listMine(req.user.id) });
}

export async function createHeroPlacement(req, res) {
  const { vehicleId, packageId, requestedStartAt, requestedEndAt, phone } = req.body || {};
  if (!vehicleId || !packageId) return res.status(400).json({ success: false, message: 'vehicleId and packageId are required' });
  const row = await heroPlacementService.sellerCreate({ sellerId: req.user.id, vehicleId, packageId, requestedStartAt, requestedEndAt });
  if (Number(row.price) <= 0) return res.status(201).json({ success: true, data: row, paymentRequired: false });
  if (!phone) return res.status(400).json({ success: false, message: 'A valid M-Pesa phone number is required to purchase hero space' });
  const payment = await initiatePayment({
    userId: req.user.id,
    carId: null,
    type: 'hero_placement',
    amount: Number(row.price),
    phone,
    metadata: { heroPlacementId: row.id, vehicleId: row.vehicleId, packageId: row.packageId },
  });
  if (!payment?.success) return res.status(400).json({ success: false, message: payment?.message || 'Could not start payment', data: row });
  res.status(201).json({ success: true, data: row, payment });
}

export async function listAdminHeroPlacements(req, res) {
  res.json({ success: true, data: await heroPlacementService.adminList() });
}

export async function scheduleHeroPlacement(req, res) {
  const { assignedStartAt, assignedEndAt, status, adminNote } = req.body || {};
  const row = await heroPlacementService.adminSchedule(req.params.id, { assignedStartAt, assignedEndAt, status, adminNote });
  res.json({ success: true, data: row });
}
