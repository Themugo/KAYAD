// KAYAD CANONICAL INSPECTION EXECUTION
// One booking -> one vehicle_inspections execution record.
// Evidence/checklist remain on that canonical record; the dormant
// digital_inspections subsystem is intentionally not used.
import crypto from 'crypto';
import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { uploadEvidenceToStorage } from '../../middleware/evidenceUpload.js';
import { getPrivateStorageUrl, deleteMedia } from '../../services/storage.service.js';
import { getSupabase } from '../../utils/supabase.js';
import { logInfo } from '../../utils/logger.js';
import { assertInspectorAccess } from './workforceService.js';
import { reportService } from './index.js';

const ALLOWED = new Set(['pass', 'fail', 'warning', 'not_applicable', 'not_inspected']);
const EXECUTABLE = new Set(['travelling', 'inspection_started']);

const actorRole = (req) => req.user?.role || null;

async function getBooking(bookingId) {
  const booking = await db.findById('inspection_bookings', bookingId);
  if (!booking) throw new AppError('Inspection booking not found', 404);
  return booking;
}

async function hydrateEvidence(execution) {
  if (!execution) return execution;
  const evidence = Array.isArray(execution.evidence) ? execution.evidence : [];
  const hydrated = await Promise.all(evidence.map(async (item) => ({
    ...item,
    url: item.storagePath ? await getPrivateStorageUrl(item.storagePath, 900) : item.url || null,
    thumbnailUrl: item.thumbnailPath ? await getPrivateStorageUrl(item.thumbnailPath, 900) : item.thumbnailUrl || null,
  })));
  return { ...execution, evidence: hydrated };
}

async function getExecution(bookingId) {
  const booking = await getBooking(bookingId);
  let execution = await db.findOne('vehicle_inspections', { inspection_booking_id: bookingId });
  if (!execution) {
    execution = await db.findOne('vehicle_inspections', { id: booking.vehicle_inspection_id });
  }
  return { booking, execution: await hydrateEvidence(execution) };
}

async function ensureExecution(booking, staff) {
  if (!booking.assigned_staff_id || String(booking.assigned_staff_id) !== String(staff.id)) {
    throw new AppError('This inspection is not assigned to you', 403);
  }
  if (booking.payment_status !== 'fully_paid') {
    throw new AppError('Inspection must be fully paid before execution', 409);
  }
  let execution = await db.findOne('vehicle_inspections', { inspection_booking_id: booking.id });
  if (execution) return execution;

  const payload = {
    car_id: booking.vehicle_id || null,
    requester_id: booking.customer_id,
    inspector_id: staff.user_id,
    inspection_booking_id: booking.id,
    status: 'in_progress',
    scheduled_at: `${booking.scheduled_date}T${String(booking.scheduled_time || '00:00:00').slice(0,8)}`,
    checklist: [],
    evidence: [],
    created_at: new Date(),
    updated_at: new Date(),
  };
  // vehicle_inspections.car_id is NOT NULL in the original schema. If the
  // booking was created without a canonical vehicle, fail closed rather than
  // inventing a vehicle identity.
  if (!payload.car_id) throw new AppError('Booking is not linked to a canonical vehicle', 409);
  execution = await db.create('vehicle_inspections', payload);
  await db.update('inspection_bookings', booking.id, { vehicle_inspection_id: execution.id });
  return execution;
}

async function assertAccess(booking, req) {
  const staff = await assertInspectorAccess(booking, req.user.id, actorRole(req));
  return ensureExecution(booking, staff);
}

export async function startInspection(bookingId, req) {
  const booking = await getBooking(bookingId);
  if (!['inspector_assigned', 'travelling', 'inspection_started'].includes(booking.status)) {
    throw new AppError(`Inspection cannot be started from ${booking.status}`, 409);
  }
  const execution = await assertAccess(booking, req);
  if (booking.status === 'inspection_started') return getExecution(booking.id);

  if (booking.status === 'inspector_assigned') {
    await db.update('inspection_bookings', booking.id, {
      status: 'travelling', status_changed_at: new Date(), updated_at: new Date(),
    });
    await db.create('inspection_status_history', {
      booking_id: booking.id, from_status: 'inspector_assigned', to_status: 'travelling',
      changed_by: req.user.id, staff_id: execution.inspector_id || booking.assigned_staff_id,
      notes: 'Inspector accepted assignment and began travel', created_at: new Date(),
    });
  }

  await db.update('inspection_bookings', booking.id, {
    status: 'inspection_started', started_at: new Date(), status_changed_at: new Date(), updated_at: new Date(),
  });
  await db.create('inspection_status_history', {
    booking_id: booking.id, from_status: booking.status === 'inspector_assigned' ? 'travelling' : booking.status,
    to_status: 'inspection_started', changed_by: req.user.id, staff_id: booking.assigned_staff_id,
    notes: 'Inspector started canonical inspection execution', created_at: new Date(),
  });
  await db.update('vehicle_inspections', execution.id, {
    status: 'in_progress', execution_started_at: new Date(), current_stage: 'inspection', updated_at: new Date(),
  });
  return getExecution(booking.id);
}

export async function saveChecklist(bookingId, req, items) {
  const booking = await getBooking(bookingId);
  const { execution } = await assertAccess(booking, req);
  if (!EXECUTABLE.has(booking.status)) throw new AppError('Inspection checklist is not editable at this stage', 409);
  if (!Array.isArray(items) || items.length === 0) throw new AppError('Checklist items are required', 400);
  const normalized = items.map((item, index) => {
    const status = String(item.status || 'not_inspected');
    if (!ALLOWED.has(status)) throw new AppError(`Invalid checklist status at item ${index + 1}`, 400);
    return {
      category: String(item.category || 'general'),
      itemNumber: Number(item.itemNumber || index + 1),
      itemName: String(item.itemName || `Inspection item ${index + 1}`),
      status,
      conditionNotes: item.conditionNotes || item.notes || null,
      severity: item.severity || null,
      evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds : [],
      updatedAt: new Date().toISOString(),
    };
  });
  await db.update('vehicle_inspections', execution.id, {
    checklist: normalized,
    updated_at: new Date(),
  });
  return getExecution(bookingId);
}

export async function uploadEvidence(bookingId, req, file) {
  const booking = await getBooking(bookingId);
  const { execution } = await assertAccess(booking, req);
  if (!EXECUTABLE.has(booking.status)) throw new AppError('Evidence cannot be uploaded at this stage', 409);
  if (!file) throw new AppError('Evidence file is required', 400);

  const type = req.body?.type || (file.mimetype.startsWith('image/') ? 'image' : 'document');
  const asset = await uploadEvidenceToStorage(file, type);
  const evidence = Array.isArray(execution.evidence) ? execution.evidence : [];
  const entry = {
    id: crypto.randomUUID(),
    type,
    storagePath: asset.path,
    bucket: asset.bucket,
    publicId: asset.public_id,
    thumbnailPath: asset.path,
    // URLs are generated at read time; never persist expiring signed URLs.
    url: null,
    thumbnailUrl: null,
    filename: file.originalname,
    mimeType: file.mimetype,
    bytes: file.size,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    checklistItem: req.body?.itemNumber ? Number(req.body.itemNumber) : null,
    category: req.body?.category || null,
    description: req.body?.description || null,
    uploadedBy: req.user.id,
    uploadedAt: new Date().toISOString(),
  };
  evidence.push(entry);
  try {
    await db.update('vehicle_inspections', execution.id, { evidence, updated_at: new Date() });
  } catch (error) {
    // Do not leave orphaned private objects when the canonical execution record
    // cannot be updated. Storage and DB must converge or the upload fails.
    await deleteMedia({ bucket: asset.bucket, path: asset.path }).catch(() => {});
    throw error;
  }
  return entry;
}

export async function deleteEvidence(bookingId, evidenceId, req) {
  const booking = await getBooking(bookingId);
  const { execution } = await assertAccess(booking, req);
  if (!EXECUTABLE.has(booking.status)) throw new AppError('Evidence cannot be deleted at this stage', 409);
  const evidence = Array.isArray(execution.evidence) ? execution.evidence : [];
  const target = evidence.find((item) => String(item.id) === String(evidenceId));
  if (!target) throw new AppError('Evidence not found', 404);

  const remaining = evidence.filter((item) => String(item.id) !== String(evidenceId));
  const checklist = Array.isArray(execution.checklist) ? execution.checklist : [];
  const wouldBreakFinding = checklist.some((item) => {
    if (!['fail', 'warning'].includes(item.status)) return false;
    return !remaining.some((itemEvidence) =>
      Number(itemEvidence.checklistItem) === Number(item.itemNumber) &&
      (!itemEvidence.category || itemEvidence.category === item.category)
    );
  });
  if (wouldBreakFinding) throw new AppError('Evidence is required for a failed or warning checklist item', 409);

  await deleteMedia({ bucket: target.bucket || undefined, path: target.storagePath });
  await db.update('vehicle_inspections', execution.id, { evidence: remaining, updated_at: new Date() });
  return { deleted: true, evidenceId: target.id };
}

export async function completeInspection(bookingId, req, notes = null) {
  const booking = await getBooking(bookingId);
  const { execution } = await assertAccess(booking, req);
  if (booking.status !== 'inspection_started') throw new AppError('Inspection must be started before completion', 409);
  const checklist = Array.isArray(execution.checklist) ? execution.checklist : [];
  const evidence = Array.isArray(execution.evidence) ? execution.evidence : [];
  const expectedItems = Object.values(reportService.INSPECTION_CATEGORIES || {}).reduce((sum, category) => sum + category.items.length, 0);
  if (checklist.length !== expectedItems) {
    throw new AppError(`Complete all ${expectedItems} inspection checklist items before submission`, 409);
  }
  const uniqueItems = new Set(checklist.map((item) => `${item.category}:${item.itemNumber}`));
  if (uniqueItems.size !== checklist.length) throw new AppError('Checklist contains duplicate items', 409);
  const unresolved = checklist.filter(i => !ALLOWED.has(i.status));
  if (unresolved.length) throw new AppError('Checklist contains invalid statuses', 409);
  const unsupported = checklist.filter(i => !Object.prototype.hasOwnProperty.call(reportService.INSPECTION_CATEGORIES || {}, i.category));
  if (unsupported.length) throw new AppError('Checklist contains unsupported categories', 409);
  const actionableFindings = checklist.filter(i => ['fail', 'warning'].includes(i.status));
  const missingEvidence = actionableFindings.filter(i => !evidence.some(e => Number(e.checklistItem) === Number(i.itemNumber) && (!e.category || e.category === i.category)));
  if (missingEvidence.length) throw new AppError('Failed or warning checklist items require supporting evidence before submission', 409);

  await db.update('vehicle_inspections', execution.id, {
    status: 'completed',
    completed_at: new Date(),
    execution_completed_at: new Date(),
    execution_submitted_at: new Date(),
    execution_submitted_by: req.user.id,
    execution_notes: notes || null,
    checklist,
    evidence,
    updated_at: new Date(),
  });
  await db.update('inspection_bookings', booking.id, {
    status: 'inspection_complete', completed_at: new Date(), status_changed_at: new Date(), updated_at: new Date(),
  });

  const findings = checklist.map((item) => ({
    category: item.category,
    itemNumber: item.itemNumber,
    itemName: item.itemName,
    status: item.status,
    conditionNotes: item.conditionNotes,
    severity: item.severity,
    photos: evidence.filter(e => Number(e.checklistItem) === Number(item.itemNumber)).map(e => e.storagePath).filter(Boolean),
  }));
  const scores = {};
  for (const item of checklist) {
    if (!scores[item.category]) scores[item.category] = { passed: 0, inspected: 0 };
    if (item.status !== 'not_inspected' && item.status !== 'not_applicable') {
      scores[item.category].inspected++;
      if (item.status === 'pass') scores[item.category].passed++;
    }
  }
  const scoreFor = (key) => scores[key]?.inspected ? Math.round((scores[key].passed / scores[key].inspected) * 100) : 0;
  const reportData = {
    engineScore: scoreFor('engine'), transmissionScore: scoreFor('transmission'), suspensionScore: scoreFor('suspension'),
    brakesScore: scoreFor('brakes'), electricalScore: scoreFor('electrical'), interiorScore: scoreFor('interior'),
    exteriorScore: scoreFor('exterior'), bodyScore: scoreFor('body'), paintScore: scoreFor('paint'), tyresScore: scoreFor('tyres'),
    undercarriageScore: scoreFor('undercarriage'), roadTestScore: scoreFor('road_test'), findings,
    photos: evidence.map(e => e.storagePath).filter(Boolean), technicianNotes: notes || '', executiveSummary: 'Inspection execution submitted for independent QA review.',
    recommendations: findings.filter(f => ['fail','warning'].includes(f.status)).map(f => `${f.itemName}: ${f.conditionNotes || f.status}`),
    roadTestPerformed: Boolean(scores.road_test),
  };
  const report = await reportService.createReport(booking.id, reportData, req.user.id, booking.provider_id);
  logInfo('Canonical inspection execution completed', { bookingId, executionId: execution.id, reportId: report.id });
  return { booking: await getBooking(booking.id), execution: await getExecution(booking.id), report };
}

export async function getExecutionDetails(bookingId, req) {
  const { booking, execution } = await getExecution(bookingId);
  const isCustomer = String(booking.customer_id) === String(req.user.id);
  const isAdmin = ['admin','superadmin'].includes(req.user.role);
  const isProvider = await db.findOne('inspection_staff', { provider_id: booking.provider_id, user_id: req.user.id, is_active: true });
  if (!isCustomer && !isAdmin && !isProvider) throw new AppError('You do not have access to this inspection execution', 403);
  return { booking, execution };
}
