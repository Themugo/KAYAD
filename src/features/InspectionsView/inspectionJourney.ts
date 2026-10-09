/**
 * Pure presentation model for the public Pre-Purchase Inspection journey.
 *
 * KAYAD has two inspection products that live in two canonical records
 * (see INSPECTION_PRODUCT_DISCOVERY.md):
 *   - "kayad":    a KAYAD vehicle inspection (vehicle_inspections, /api/inspections/order|my)
 *   - "provider": a booking with a verified provider (inspection_bookings, /api/inspection/bookings)
 *
 * This module only PROJECTS what the server returned into one customer-facing
 * record. It never invents a status, a price, a schedule or a verdict: if a
 * value is not returned it stays undefined and the UI says so.
 */
import type { BackendInspectionOrder } from '../../services/inspectionApi';
import type { Booking } from '../InspectionMarketplace/types/inspection';

export type InspectionProduct = 'kayad' | 'provider';
export type StatusTone = 'neutral' | 'active' | 'success' | 'danger';

export interface InspectionStatusView {
  label: string;
  detail: string;
  tone: StatusTone;
  /** 0-3 position on the four customer-facing stages, or -1 when the record left the flow. */
  stage: number;
}

export const INSPECTION_STAGES = ['Requested', 'Assigned', 'Inspecting', 'Report'] as const;

export interface InspectionRecord {
  key: string;
  product: InspectionProduct;
  /** Server-issued identifier shown to the customer (order id or booking reference). */
  reference: string;
  vehicleTitle: string;
  vehicleId?: string;
  location?: string;
  status: InspectionStatusView;
  inspectorName?: string;
  providerName?: string;
  packageName?: string;
  /** Provider bookings only: the slot the customer chose. */
  schedule?: string;
  /** Provider bookings: total price. KAYAD requests: the quoted fee recorded on the order (not charged). */
  priceText?: string;
  paymentText?: string;
  /** True only for a provider booking that still needs payment and can accept it. */
  canPay: boolean;
  bookingId?: string;
  createdAt?: string;
  hasReport: boolean;
  report?:
    | { kind: 'kayad'; order: BackendInspectionOrder }
    | { kind: 'provider'; reportId: string; number?: string };
}

const KAYAD_STATUS: Record<string, InspectionStatusView> = {
  // The backend keeps the historical value `pending_payment` for a freshly
  // requested order. A KAYAD vehicle inspection request does not take payment,
  // so the customer-facing meaning is simply "requested".
  pending_payment: { label: 'Request received', detail: 'Waiting for KAYAD to assign an inspector.', tone: 'neutral', stage: 0 },
  requested: { label: 'Request received', detail: 'Waiting for KAYAD to assign an inspector.', tone: 'neutral', stage: 0 },
  assigned: { label: 'Inspector assigned', detail: 'An inspector has been assigned to your vehicle.', tone: 'active', stage: 1 },
  in_progress: { label: 'Inspection in progress', detail: 'The inspector has started inspecting the vehicle.', tone: 'active', stage: 2 },
  completed: { label: 'Report ready', detail: 'The inspection is complete and the report is available.', tone: 'success', stage: 3 },
};

const PROVIDER_STATUS: Record<string, InspectionStatusView> = {
  booked: { label: 'Booked', detail: 'Your slot is held. Complete payment to confirm it.', tone: 'neutral', stage: 0 },
  confirmed: { label: 'Confirmed', detail: 'The provider has confirmed your booking.', tone: 'active', stage: 0 },
  inspector_assigned: { label: 'Inspector assigned', detail: 'The provider has assigned an inspector.', tone: 'active', stage: 1 },
  travelling: { label: 'Inspector on the way', detail: 'The inspector is travelling to the vehicle.', tone: 'active', stage: 1 },
  inspection_started: { label: 'Inspection in progress', detail: 'The inspection has started.', tone: 'active', stage: 2 },
  inspection_complete: { label: 'Inspection complete', detail: 'The report is being prepared.', tone: 'active', stage: 2 },
  report_generated: { label: 'Report ready', detail: 'Your inspection report is available.', tone: 'success', stage: 3 },
  customer_reviewed: { label: 'Report ready', detail: 'Your inspection report is available.', tone: 'success', stage: 3 },
  closed: { label: 'Report ready', detail: 'Your inspection report is available.', tone: 'success', stage: 3 },
  cancelled: { label: 'Cancelled', detail: 'This booking was cancelled.', tone: 'danger', stage: -1 },
  no_show: { label: 'Not completed', detail: 'This booking was marked as a no-show.', tone: 'danger', stage: -1 },
};

const PAYMENT_TEXT: Record<string, string> = {
  pending: 'Payment pending',
  deposit_paid: 'Deposit paid',
  fully_paid: 'Paid',
  refunded: 'Refunded',
};

const UNKNOWN_STATUS: InspectionStatusView = {
  label: 'Status unavailable',
  detail: 'KAYAD returned a status this page does not recognise. Contact support if it does not change.',
  tone: 'neutral',
  stage: -1,
};

const humanise = (value: string) => value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function kayadStatusView(status: string | undefined): InspectionStatusView {
  if (!status) return UNKNOWN_STATUS;
  return KAYAD_STATUS[status] || { ...UNKNOWN_STATUS, label: humanise(status) };
}

export function providerStatusView(status: string | undefined): InspectionStatusView {
  if (!status) return UNKNOWN_STATUS;
  return PROVIDER_STATUS[status] || { ...UNKNOWN_STATUS, label: humanise(status) };
}

const money = (amount: number | undefined, currency = 'KES') =>
  typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? `${currency === 'KES' ? 'KSh' : currency} ${amount.toLocaleString()}` : undefined;

const dateText = (value?: string | null) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export function businessNameOf(inspector: BackendInspectionOrder['inspector']): string | undefined {
  if (!inspector || typeof inspector === 'string') return undefined;
  return inspector.businessName || undefined;
}

export function inspectorNameOf(inspector: BackendInspectionOrder['inspector']): string | undefined {
  if (!inspector || typeof inspector === 'string') return undefined;
  return inspector.name || undefined;
}

export function kayadOrderToRecord(order: BackendInspectionOrder): InspectionRecord {
  const id = order.id || order._id || '';
  const status = kayadStatusView(order.status);
  const completed = order.status === 'completed';
  return {
    key: `kayad:${id}`,
    product: 'kayad',
    reference: id,
    vehicleId: order.car?.id || order.car?._id,
    vehicleTitle: order.car?.title || 'Vehicle',
    location: order.location || order.car?.location || undefined,
    status,
    inspectorName: inspectorNameOf(order.inspector),
    providerName: businessNameOf(order.inspector),
    priceText: money(order.fee),
    paymentText: 'No payment taken by this request',
    canPay: false,
    createdAt: order.createdAt,
    hasReport: completed,
    report: completed ? { kind: 'kayad', order } : undefined,
  };
}

export function providerBookingToRecord(booking: Booking): InspectionRecord {
  const status = providerStatusView(booking.status);
  const vehicle = booking.vehicle;
  const title = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : '';
  const place = [booking.location?.town, booking.location?.county].filter(Boolean).join(', ');
  const payment = PAYMENT_TEXT[booking.paymentStatus] || (booking.paymentStatus ? humanise(booking.paymentStatus) : undefined);
  const open = !['cancelled', 'no_show', 'closed'].includes(booking.status);
  const schedule = [dateText(booking.scheduledDate), booking.scheduledTime?.slice(0, 5)].filter(Boolean).join(' · ');
  return {
    key: `provider:${booking.id}`,
    product: 'provider',
    reference: booking.reference || booking.id,
    vehicleTitle: title || 'Vehicle',
    location: place || booking.location?.address || undefined,
    status,
    inspectorName: booking.inspector?.name,
    providerName: booking.provider?.name,
    packageName: booking.package?.name,
    schedule: schedule || undefined,
    priceText: money(booking.totalPrice, booking.currency),
    paymentText: payment,
    canPay: open && booking.paymentStatus === 'pending',
    bookingId: booking.id,
    createdAt: booking.createdAt,
    hasReport: Boolean(booking.report?.id),
    report: booking.report?.id ? { kind: 'provider', reportId: booking.report.id, number: booking.report.number } : undefined,
  };
}

/** Newest first; records without a usable date sort last but keep their order. */
export function sortRecords(records: InspectionRecord[]): InspectionRecord[] {
  const time = (r: InspectionRecord) => {
    const t = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...records].sort((a, b) => time(b) - time(a));
}

// ---------------------------------------------------------------------------
// Report projection for a KAYAD vehicle inspection (vehicle_inspections row).
// The backend stores a numeric score, a free-text condition rating, the
// inspector's notes, a schemaless checklist array and evidence images. There
// is NO verdict, VIN/logbook check or category score - none is shown.
// ---------------------------------------------------------------------------
export interface KayadReportView {
  reference: string;
  vehicleTitle: string;
  score: number | undefined;
  conditionRating: string | undefined;
  inspectorName: string | undefined;
  businessName: string | undefined;
  completedOn: string | undefined;
  notes: string | undefined;
  checklist: Array<{ label: string; result?: string }>;
  photos: string[];
}

export function kayadReportView(order: BackendInspectionOrder): KayadReportView {
  const score = typeof order.overallScore === 'number' && Number.isFinite(order.overallScore) ? order.overallScore : undefined;
  const evidence = [...(order.images || []), ...(order.evidence || [])];
  const photos = [...new Set(evidence.map((e) => (typeof e === 'string' ? e : e?.url)).filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)))];
  const checklist = (Array.isArray(order.checklist) ? order.checklist : [])
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      const label = [e.item, e.name, e.label, e.title].find((v) => typeof v === 'string' && v.trim()) as string | undefined;
      if (!label) return null;
      const result = [e.status, e.result, e.condition].find((v) => typeof v === 'string' && v.trim()) as string | undefined;
      return { label: label.trim(), result: result ? humanise(result) : undefined };
    })
    .filter((x): x is { label: string; result: string | undefined } => Boolean(x));
  const rating = order.conditionRating ? humanise(order.conditionRating) : undefined;
  return {
    reference: order.id || order._id || '',
    vehicleTitle: order.car?.title || 'Vehicle',
    score,
    conditionRating: rating,
    inspectorName: inspectorNameOf(order.inspector),
    businessName: businessNameOf(order.inspector),
    completedOn: dateText(order.completedAt),
    notes: order.inspectorNotes?.trim() || undefined,
    checklist,
    photos,
  };
}

/** Minimal client-side check mirroring the backend requirement (`phone` required). */
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}
