import asyncHandler from '../../middleware/asyncHandler.js';
import { protect, adminOnly } from '../../middleware/auth.js';
import { getSupabase } from '../../utils/supabase.js';
import { AppError } from '../../utils/AppError.js';
import { initiatePayment } from '../../services/paymentService.js';
import { getIO } from '../../utils/io.js';
import Car from '../../models/Car.js';
import User from '../../models/User.js';
import { emitCommunication, COMMUNICATION_EVENTS } from '../../services/communicationEvents.service.js';

// STAGE 2 API CONTRACT CONVERGENCE FIX: 'assigned' added alongside the fix to
// assign() below (which previously never actually set this status). Without
// it, a customer whose inspection has already been assigned to an inspector
// (but not yet started) could book a second, duplicate inspection for the
// same vehicle, since the active-inspection duplicate check below would no
// longer see it as "active".
const activeStatuses = ['requested', 'assigned', 'in_progress'];
const gradeFor = (score) => {
  const n = Number(score) || 0;
  if (n >= 90) return 'A';
  if (n >= 80) return 'B+';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  return 'D';
};

async function getInspection(id) {
  const { data, error } = await getSupabase().from('vehicle_inspections').select('*').eq('id', id).maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!data) throw new AppError('Inspection not found', 404);
  return data;
}

async function assertAccess(inspection, user) {
  const isAdmin = ['admin', 'superadmin'].includes(user.role);
  if (isAdmin || String(inspection.requester_id) === String(user.id) || String(inspection.inspector_id) === String(user.id)) return;
  throw new AppError('Access denied', 403);
}

function legacyOrder(inspection, car, buyer = null, inspector = null) {
  const notes = (() => { try { return JSON.parse(inspection.notes || '{}'); } catch { return {}; } })();
  return {
    id: inspection.id,
    _id: inspection.id,
    car: car || { _id: inspection.car_id, id: inspection.car_id },
    buyer: buyer || inspection.requester_id,
    inspector: inspector || inspection.inspector_id,
    fee: Number(notes.fee || 0),
    payment: notes.payment || null,
    // STAGE 2 API CONTRACT CONVERGENCE FIX: 'assigned' is now a real status
    // this table can carry (see assign() below) and the frontend's own
    // statusMap (src/features/InspectionsView.tsx) already has a case for it
    // ('Scheduled') — it was dead code until now because the backend never
    // actually emitted it, so an assigned-but-not-started inspection always
    // collapsed to 'pending_payment' ("Pending Mechanic Confirmation") even
    // though an inspector had already been assigned.
    status: inspection.status === 'completed' ? 'completed'
      : inspection.status === 'in_progress' ? 'in_progress'
      : inspection.status === 'assigned' ? 'assigned'
      : 'pending_payment',
    location: notes.location || null,
    checkoutRequestID: notes.checkoutRequestID || null,
    checklist: inspection.checklist || [],
    overallScore: inspection.overall_score || 0,
    conditionRating: inspection.condition_rating || 'fair',
    inspectorNotes: inspection.inspector_notes || '',
    images: inspection.evidence || [],
    evidence: inspection.evidence || [],
    completedAt: inspection.completed_at || null,
    createdAt: inspection.created_at,
    updatedAt: inspection.updated_at,
    digitalInspectionId: inspection.id,
    chatId: inspection.chat_id || null,
  };
}

export const listMine = asyncHandler(async (req, res) => {
  const { data, error } = await getSupabase().from('vehicle_inspections').select('*').eq('requester_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, orders: data || [] });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { carId, phone, location } = req.body;
  if (!carId || !phone) return res.status(400).json({ success: false, message: 'carId and phone required' });
  const car = await Car.findById(carId);
  if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

  const { data: existing } = await getSupabase().from('vehicle_inspections').select('*').eq('car_id', carId).eq('requester_id', req.user.id).in('status', activeStatuses).maybeSingle();
  if (existing) return res.status(409).json({ success: false, message: 'You already have an active inspection for this vehicle' });

  let fee = 2500;
  try {
    const { data: setting, error } = await getSupabase().from('system_settings').select('value').eq('key', 'ghostCheckFee').maybeSingle();
    if (!error && setting) {
      const raw = typeof setting.value === 'object' ? setting.value?.amount : setting.value;
      if (Number.isFinite(Number(raw)) && Number(raw) > 0) fee = Number(raw);
    }
  } catch {}

  const payment = await initiatePayment({ userId: req.user.id, carId, type: 'inspection', amount: fee, phone, metadata: { service: 'inspection', canonical: true } });
  const notes = JSON.stringify({ fee, payment: payment._id || payment.id || null, checkoutRequestID: payment.checkoutID || payment.checkoutRequestID || null, phone, location });
  const { data: inspection, error } = await getSupabase().from('vehicle_inspections').insert({ car_id: carId, requester_id: req.user.id, status: 'requested', notes }).select('*').single();
  if (error) throw new AppError(error.message, 500);

  const { data: bridge, error: bridgeError } = await getSupabase().rpc('kayad_bridge_inspection_execution', { p_vehicle_inspection_id: inspection.id, p_car_id: carId, p_buyer_id: req.user.id, p_provider_id: null });
  if (bridgeError) throw new AppError(bridgeError.message, 500);
  const chatId = bridge?.chatId || null;
  if (getIO()) getIO().to(`user_${req.user.id}`).emit('inspectionUpdated', { inspectionId: inspection.id, status: 'pending_payment', digitalInspectionId: inspection.id, chatId });
  await emitCommunication({ userId: req.user.id, eventType: COMMUNICATION_EVENTS.INSPECTION_BOOKED, title: 'Inspection booked', message: `Your vehicle inspection for ${car.title || 'the vehicle'} has been booked.`, channels: ['in_app', 'email', 'sms', 'whatsapp'], metadata: { inspectionId: inspection.id, carId } }).catch(() => {});
  res.json({ success: true, order: legacyOrder({ ...inspection, chat_id: chatId }, car), checkoutRequestID: payment.checkoutID || payment.checkoutRequestID });
});

export const getById = asyncHandler(async (req, res) => {
  const inspection = await getInspection(req.params.id);
  await assertAccess(inspection, req.user);
  const [car, buyer, inspector] = await Promise.all([
    Car.findById(inspection.car_id).catch(() => null),
    User.findById(inspection.requester_id).catch(() => null),
    inspection.inspector_id ? User.findById(inspection.inspector_id).catch(() => null) : null,
  ]);
  res.json({ success: true, order: legacyOrder(inspection, car, buyer, inspector) });
});

export const getByCar = asyncHandler(async (req, res) => {
  const { data: inspection, error } = await getSupabase().from('vehicle_inspections').select('*').eq('car_id', req.params.carId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!inspection) return res.json({ success: true, inspection: null });
  const [car, inspector] = await Promise.all([Car.findById(inspection.car_id).catch(() => null), inspection.inspector_id ? User.findById(inspection.inspector_id).catch(() => null) : null]);
  res.json({ success: true, inspection: legacyOrder(inspection, car, null, inspector) });
});

export const assign = asyncHandler(async (req, res) => {
  const inspection = await getInspection(req.params.id);
  if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admin access required' });
  if (inspection.status !== 'requested') return res.status(400).json({ success: false, message: 'Inspection must be requested before assignment' });
  const { inspectorId } = req.body;
  if (!inspectorId) return res.status(400).json({ success: false, message: 'inspectorId required' });
  // STAGE 2 API CONTRACT CONVERGENCE FIX: this re-set status to 'requested'
  // (a no-op, since the precondition above already requires it to be
  // 'requested') instead of ever advancing it. Two existing, already-shipped
  // admin surfaces — commandCenterController.js::getInspectionOperations and
  // operationsDashboardController.js's overview counts — already query
  // vehicle_inspections for status:'assigned' expecting this exact
  // transition to exist; because it never did, "assigned" always counted as
  // zero on those dashboards, and a buyer whose inspection had just been
  // assigned to an inspector still saw "Pending Mechanic Confirmation" with
  // no visible progress (see legacyOrder()'s status mapping above).
  const { data, error } = await getSupabase().from('vehicle_inspections').update({ inspector_id: inspectorId, status: 'assigned', updated_at: new Date().toISOString() }).eq('id', inspection.id).select('*').single();
  if (error) throw new AppError(error.message, 500);
  const { data: car } = await getSupabase().from('cars').select('dealer_id').eq('id', inspection.car_id).maybeSingle();
  const { data: chatId, error: chatError } = await getSupabase().rpc('kayad_get_or_create_inspection_chat', { p_vehicle_inspection_id: inspection.id, p_car_id: inspection.car_id, p_buyer_id: inspection.requester_id, p_seller_id: car?.dealer_id || null, p_inspector_id: inspectorId });
  if (chatError) throw new AppError(chatError.message, 500);
  res.json({ success: true, order: legacyOrder({ ...data, chat_id: chatId }) });
});

export const start = asyncHandler(async (req, res) => {
  const inspection = await getInspection(req.params.id);
  await assertAccess(inspection, req.user);
  if (String(inspection.inspector_id) !== String(req.user.id) && !['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not your assignment' });
  // STAGE 5 INSPECTION/PROVIDER-OPERATIONS CONVERGENCE FIX: this had no
  // status-precondition guard at all (unlike assign(), which requires
  // 'requested', and submit(), which requires 'in_progress'). Without one,
  // the assigned inspector (or an admin) could call start() again on an
  // already-'completed' inspection, silently reverting a finished,
  // buyer-visible report back to 'in_progress' -- a backward status
  // transition with no real-world meaning, confusing both the buyer-facing
  // statusMap (legacyOrder() above) and the admin dashboards that count
  // inspections by status (commandCenterController.js,
  // operationsDashboardController.js).
  if (inspection.status !== 'assigned') return res.status(400).json({ success: false, message: 'Inspection must be assigned before it can be started' });
  const { data, error } = await getSupabase().from('vehicle_inspections').update({ status: 'in_progress', current_stage: 'job_verification', scheduled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', inspection.id).select('*').single();
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, order: legacyOrder(data) });
});

export const submit = asyncHandler(async (req, res) => {
  const inspection = await getInspection(req.params.id);
  await assertAccess(inspection, req.user);
  if (String(inspection.inspector_id) !== String(req.user.id) && !['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not your assignment' });
  if (inspection.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Inspection not in progress' });
  const { checklist = [], overallScore = 0, conditionRating = 'fair', inspectorNotes = '', images = [] } = req.body;
  const { data, error } = await getSupabase().from('vehicle_inspections').update({ checklist, overall_score: Number(overallScore) || 0, condition_rating: conditionRating, inspector_notes: inspectorNotes, evidence: images, status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', inspection.id).select('*').single();
  if (error) throw new AppError(error.message, 500);
  if (getIO()) {
    const event = { inspectionId: data.id, status: 'completed', digitalInspectionId: data.id, overallScore: data.overall_score, conditionRating: data.condition_rating, chatId: data.chat_id || null };
    getIO().to(`user_${data.requester_id}`).emit('inspectionUpdated', event);
    if (data.inspector_id) getIO().to(`user_${data.inspector_id}`).emit('inspectionUpdated', event);
    getIO().to(`inspection_${data.id}`).emit('inspectionUpdated', event);
  }
  await emitCommunication({ userId: data.requester_id, eventType: COMMUNICATION_EVENTS.INSPECTION_COMPLETED, title: 'Inspection completed', message: `Your vehicle inspection is complete with a score of ${Number(data.overall_score) || 0}/100.`, channels: ['in_app', 'email', 'sms', 'whatsapp'], metadata: { inspectionId: data.id, carId: data.car_id, overallScore: data.overall_score, conditionRating: data.condition_rating } }).catch(() => {});
  res.json({ success: true, order: legacyOrder(data) });
});

export const availableInspectors = asyncHandler(async (req, res) => {
  const inspectors = await User.find({ role: 'ghost_checker', isInspector: true }).select('name email phone locationCity inspectionSpecialty averageRating completedChecks').lean();
  res.json({ success: true, inspectors });
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const { checkoutRequestID } = req.body;
  if (!checkoutRequestID) return res.status(400).json({ success: false, message: 'checkoutRequestID required' });
  // STAGE 5 INSPECTION/PROVIDER-OPERATIONS CONVERGENCE FIX: this had no
  // ownership scoping at all -- it looked up ANY inspection whose stringified
  // `notes` JSON contained the client-supplied checkoutRequestID substring,
  // then returned that row's full order (buyer id, car id, checklist,
  // inspector notes, evidence) to whichever authenticated user happened to
  // call this endpoint, admin or not. Two compounding problems: (1) no
  // isAdmin/isOwner check at all -- any signed-in user who learned or
  // guessed another buyer's checkoutRequestID (Safaricom's own ID, not a
  // KAYAD secret) could read that buyer's complete inspection record; (2)
  // `.like()` treats '%' and '_' in the client-supplied value as SQL LIKE
  // wildcards, so a value of just '%' matches every row in the table,
  // handing back an arbitrary stranger's inspection with no checkoutRequestID
  // knowledge needed at all. Scoping to the caller's own requester_id (admins
  // excepted, consistent with assertAccess() above) closes both: a non-admin
  // can now only ever match their own rows, so a wildcard value finds nothing
  // more than that same person's own active/completed orders.
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  let query = getSupabase().from('vehicle_inspections').select('*').like('notes', `%${checkoutRequestID}%`);
  if (!isAdmin) query = query.eq('requester_id', req.user.id);
  const { data: rows, error } = await query.limit(1);
  if (error) throw new AppError(error.message, 500);
  if (!rows?.length) return res.status(404).json({ success: false, message: 'Inspection order not found' });
  res.json({ success: true, order: legacyOrder(rows[0]) });
});

export default { protect, adminOnly, listMine, createOrder, getById, getByCar, assign, start, submit, availableInspectors, confirmPayment };
