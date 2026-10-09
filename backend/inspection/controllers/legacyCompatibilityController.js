import asyncHandler from '../../middleware/asyncHandler.js';
import { protect, adminOnly } from '../../middleware/auth.js';
import { getSupabase } from '../../utils/supabase.js';
import { AppError } from '../../utils/AppError.js';
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

// The performing party must be identifiable from authoritative data: the inspector's display name
// and the independent business (inspection_providers) they work as. Never email, phone or other PII.
async function businessNamesByUser(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const { data, error } = await getSupabase().from('inspection_providers').select('user_id,company_name,trading_name').in('user_id', ids);
  if (error) return new Map();
  return new Map((data || []).map((r) => [String(r.user_id), r.trading_name || r.company_name || null]));
}
function publicInspector(user, businessName) {
  if (!user) return null;
  const id = user.id || user._id;
  return { id, _id: id, name: user.name, businessName: businessName || null };
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
    // Stage 15: null (not 0) until an inspector has recorded a score - a pending request has no score, and
    // clients show "0/100" for a defined number.
    overallScore: inspection.overall_score ?? null,
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

// INSPECTION EXPERIENCE CONVERGENCE (Stage 15): listMine used to return the raw
// `vehicle_inspections` rows while every other endpoint in this file
// (createOrder, getById, getByCar, assign, start, submit) returns legacyOrder().
// The buyer client (src/services/inspectionApi.ts::BackendInspectionOrder) is
// written against the legacyOrder shape, so the buyer's own order list could
// never show the vehicle, fee, score or inspector notes. The list now uses the
// same projection. Scope is unchanged (own rows only, requester_id = caller);
// the projection omits the raw `notes` blob (which carried the phone number).
// Only the assigned inspector's id and display name are exposed, never email.
export const listMine = asyncHandler(async (req, res) => {
  const { data, error } = await getSupabase().from('vehicle_inspections').select('*').eq('requester_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw new AppError(error.message, 500);
  const rows = data || [];
  const carIds = [...new Set(rows.map((row) => row.car_id).filter(Boolean).map(String))];
  const inspectorIds = [...new Set(rows.map((row) => row.inspector_id).filter(Boolean).map(String))];
  const [carEntries, inspectorEntries] = await Promise.all([
    Promise.all(carIds.map(async (id) => [id, await Car.findById(id).catch(() => null)])),
    Promise.all(inspectorIds.map(async (id) => [id, await User.findById(id).catch(() => null)])),
  ]);
  const cars = new Map(carEntries);
  const inspectors = new Map(inspectorEntries);
  const businesses = await businessNamesByUser(inspectorIds);
  const orders = rows.map((row) => {
    const inspector = inspectors.get(String(row.inspector_id));
    return legacyOrder(
      row,
      cars.get(String(row.car_id)) || null,
      null,
      inspector ? publicInspector(inspector, businesses.get(String(row.inspector_id))) : null,
    );
  });
  res.json({ success: true, orders });
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

  // INSPECTION EXPERIENCE CONVERGENCE (Stage 15) - D1/D2: this used to call
  // initiatePayment({ type: 'inspection', metadata: { service, canonical } }),
  // i.e. send the customer an M-Pesa prompt for the flat fee. That charge can
  // never be settled: the payment callback's inspection branch requires
  // payment.metadata.bookingId and throws "Inspection payment is missing its
  // booking reference" otherwise (services/paymentCallback.service.js), and the
  // settlement RPC kayad_process_inspection_payment_atomic only operates on
  // inspection_bookings, not vehicle_inspections. The result of initiatePayment
  // was also never checked, so an invalid phone number or an in-flight payment
  // still created the inspection. A request must not take money KAYAD cannot
  // attribute, so this request records the order and the quoted fee only; it
  // does NOT charge. Payment for a KAYAD vehicle inspection needs a
  // vehicle_inspections settlement path (RPC + callback branch) before it can
  // be re-enabled - see INSPECTION_EXPERIENCE_CONVERGENCE_REPORT.md.
  const notes = JSON.stringify({ fee, payment: null, checkoutRequestID: null, phone, location });
  const { data: inspection, error } = await getSupabase().from('vehicle_inspections').insert({ car_id: carId, requester_id: req.user.id, status: 'requested', notes }).select('*').single();
  if (error) throw new AppError(error.message, 500);

  const { data: bridge, error: bridgeError } = await getSupabase().rpc('kayad_bridge_inspection_execution', { p_vehicle_inspection_id: inspection.id, p_car_id: carId, p_buyer_id: req.user.id, p_provider_id: null });
  if (bridgeError) throw new AppError(bridgeError.message, 500);
  const chatId = bridge?.chatId || null;
  if (getIO()) getIO().to(`user_${req.user.id}`).emit('inspectionUpdated', { inspectionId: inspection.id, status: 'pending_payment', digitalInspectionId: inspection.id, chatId });
  await emitCommunication({ userId: req.user.id, eventType: COMMUNICATION_EVENTS.INSPECTION_BOOKED, title: 'Inspection booked', message: `Your vehicle inspection for ${car.title || 'the vehicle'} has been booked.`, channels: ['in_app', 'email', 'sms', 'whatsapp'], metadata: { inspectionId: inspection.id, carId } }).catch(() => {});
  res.json({ success: true, order: legacyOrder({ ...inspection, chat_id: chatId }, car), checkoutRequestID: null });
});

export const getById = asyncHandler(async (req, res) => {
  const inspection = await getInspection(req.params.id);
  await assertAccess(inspection, req.user);
  const [car, buyer, inspector] = await Promise.all([
    Car.findById(inspection.car_id).catch(() => null),
    User.findById(inspection.requester_id).catch(() => null),
    inspection.inspector_id ? User.findById(inspection.inspector_id).catch(() => null) : null,
  ]);
  const businesses = await businessNamesByUser([inspection.inspector_id]);
  res.json({ success: true, order: legacyOrder(inspection, car, buyer, publicInspector(inspector, businesses.get(String(inspection.inspector_id)))) });
});

export const getByCar = asyncHandler(async (req, res) => {
  const { data: inspection, error } = await getSupabase().from('vehicle_inspections').select('*').eq('car_id', req.params.carId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!inspection) return res.json({ success: true, inspection: null });
  const [car, inspector] = await Promise.all([Car.findById(inspection.car_id).catch(() => null), inspection.inspector_id ? User.findById(inspection.inspector_id).catch(() => null) : null]);
  const businesses = await businessNamesByUser([inspection.inspector_id]);
  res.json({ success: true, inspection: legacyOrder(inspection, car, null, publicInspector(inspector, businesses.get(String(inspection.inspector_id)))) });
});

export const assign = asyncHandler(async (req, res) => {
  const inspection = await getInspection(req.params.id);
  if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admin access required' });
  if (inspection.status !== 'requested') return res.status(400).json({ success: false, message: 'Inspection must be requested before assignment' });
  const { inspectorId } = req.body;
  if (!inspectorId) return res.status(400).json({ success: false, message: 'inspectorId required' });
  // Eligibility is enforced here, not only in a badge: the inspector must be the owner of an ACTIVE,
  // verified provider. A suspended, unverified or unknown inspector cannot be assigned.
  const { data: perfProvider, error: perfError } = await getSupabase().from('inspection_providers').select('id,status,verification_status,lifecycle_stage').eq('user_id', inspectorId).limit(1).maybeSingle();
  if (perfError) throw new AppError(perfError.message, 500);
  if (!perfProvider || perfProvider.lifecycle_stage !== 'ACTIVE' || perfProvider.status !== 'active' || perfProvider.verification_status !== 'verified') {
    return res.status(409).json({ success: false, message: 'That inspector is not an active, verified provider and cannot be assigned' });
  }
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

// Assignable inspectors for the admin who assigns a KAYAD inspection (Product A). Built from the single
// provider network: only users who own an ACTIVE, verified provider are returned, so a suspended or
// unverified inspector can never be offered here (and assign() re-checks the same rule server-side).
export const availableInspectors = asyncHandler(async (req, res) => {
  const sb = getSupabase();
  const { data: providers, error } = await sb.from('inspection_providers')
    .select('id,user_id,company_name,trading_name,county,town')
    .eq('status', 'active').eq('verification_status', 'verified').eq('lifecycle_stage', 'ACTIVE')
    .not('user_id', 'is', null).limit(200);
  if (error) throw new AppError(error.message, 500);
  const ids = [...new Set((providers || []).map((p) => p.user_id).filter(Boolean))];
  let users = [];
  if (ids.length) {
    const res2 = await sb.from('users').select('id,name,email,phone').in('id', ids);
    if (res2.error) throw new AppError(res2.error.message, 500);
    users = res2.data || [];
  }
  const byId = new Map(users.map((u) => [String(u.id), u]));
  const inspectors = (providers || []).filter((p) => byId.has(String(p.user_id))).map((p) => {
    const u = byId.get(String(p.user_id));
    return { id: u.id, _id: u.id, name: u.name, email: u.email, phone: u.phone, businessName: p.trading_name || p.company_name, location: [p.town, p.county].filter(Boolean).join(', ') || null };
  });
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
