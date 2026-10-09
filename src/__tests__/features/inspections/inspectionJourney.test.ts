import { describe, expect, it } from 'vitest';
import {
  isPlausiblePhone, kayadOrderToRecord, kayadReportView, kayadStatusView, providerBookingToRecord, providerStatusView, sortRecords,
} from '../../../features/InspectionsView/inspectionJourney';

describe('inspection journey model', () => {
  it('maps backend KAYAD statuses to truthful customer labels (pending_payment is just "requested")', () => {
    expect(kayadStatusView('pending_payment').label).toBe('Request received');
    expect(kayadStatusView('requested').stage).toBe(0);
    expect(kayadStatusView('assigned').label).toBe('Inspector assigned');
    expect(kayadStatusView('in_progress').stage).toBe(2);
    expect(kayadStatusView('completed')).toMatchObject({ label: 'Report ready', tone: 'success', stage: 3 });
  });

  it('never invents a state for an unknown status', () => {
    expect(kayadStatusView('weird_state')).toMatchObject({ label: 'Weird state', stage: -1 });
    expect(providerStatusView(undefined).label).toBe('Status unavailable');
    expect(providerStatusView('cancelled')).toMatchObject({ tone: 'danger', stage: -1 });
  });

  it('a KAYAD order is a no-payment request and only has a report when completed', () => {
    const open = kayadOrderToRecord({ id: 'o1', status: 'pending_payment', car: { id: 'c1', title: 'Prado' } } as never);
    expect(open.paymentText).toMatch(/No payment/);
    expect(open.canPay).toBe(false);
    expect(open.hasReport).toBe(false);
    const done = kayadOrderToRecord({ id: 'o2', status: 'completed', overallScore: 77, inspector: { id: 'i', name: 'Jane' } } as never);
    expect(done.hasReport).toBe(true);
    expect(done.inspectorName).toBe('Jane');
  });

  it('a provider booking can be paid only while open and unpaid', () => {
    const base = { id: 'b1', reference: 'INS-1', status: 'booked', paymentStatus: 'pending', vehicle: { year: 2020, make: 'Toyota', model: 'Prado' }, totalPrice: 5000, currency: 'KES' };
    expect(providerBookingToRecord(base as never)).toMatchObject({ canPay: true, bookingId: 'b1', vehicleTitle: '2020 Toyota Prado', priceText: 'KSh 5,000' });
    expect(providerBookingToRecord({ ...base, paymentStatus: 'fully_paid' } as never).canPay).toBe(false);
    expect(providerBookingToRecord({ ...base, status: 'cancelled' } as never).canPay).toBe(false);
    expect(providerBookingToRecord({ ...base, status: 'report_generated', report: { id: 'r1' } } as never).hasReport).toBe(true);
  });

  it('sorts newest first and keeps undated records last', () => {
    const r = (key: string, createdAt?: string) => ({ key, createdAt }) as never;
    expect(sortRecords([r('old', '2026-01-01'), r('none'), r('new', '2026-05-01')]).map((x: { key: string }) => x.key)).toEqual(['new', 'old', 'none']);
  });

  it('the KAYAD report shows only what the server stored: no invented verdict, null score stays absent', () => {
    const view = kayadReportView({
      id: 'o', status: 'completed', overallScore: null, conditionRating: 'good_condition', inspectorNotes: ' Clean ',
      checklist: [{ item: 'Brakes', status: 'ok' }, { nonsense: true }, 'x'], images: [{ url: 'https://x/1.jpg' }, { url: 'javascript:alert(1)' }], evidence: [{ url: 'https://x/1.jpg' }],
    } as never);
    expect(view.score).toBeUndefined();
    expect(view.conditionRating).toBe('Good condition');
    expect(view.notes).toBe('Clean');
    expect(view.checklist).toEqual([{ label: 'Brakes', result: 'Ok' }]);
    expect(view.photos).toEqual(['https://x/1.jpg']);
  });

  it('validates phone numbers as 9-15 digits', () => {
    expect(isPlausiblePhone('+254 712 345 678')).toBe(true);
    expect(isPlausiblePhone('0712')).toBe(false);
    expect(isPlausiblePhone('')).toBe(false);
  });
});
