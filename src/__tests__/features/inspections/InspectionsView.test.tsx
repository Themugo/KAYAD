import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const getMy = vi.fn();
const getBookings = vi.fn();
const getReport = vi.fn();
vi.mock('../../../services/inspectionApi', async (orig) => ({ ...(await orig<object>()), getMyInspections: () => getMy() }));
vi.mock('../../../features/InspectionMarketplace/services/api', () => ({
  inspectionApi: {
    getCustomerBookings: () => getBookings(),
    getReport: (...a: unknown[]) => getReport(...a),
    registerProvider: vi.fn(),
    initiatePayment: vi.fn(),
    getPaymentStatus: vi.fn(),
    cancelBooking: vi.fn(),
  },
}));
vi.mock('../../../context/SocketContext', () => ({ useSocket: () => ({ joinInspection: () => undefined, leaveChannel: () => undefined }) }));

import InspectionsView from '../../../features/InspectionsView';

const user = { id: 'u1', name: 'Amina' } as never;
const kayadDone = { id: 'ord-done', status: 'completed', overallScore: 82, conditionRating: 'good', inspectorNotes: 'Solid car', car: { id: 'c1', title: 'Prado' }, inspector: { id: 'i', name: 'Jane' }, createdAt: '2026-10-01T00:00:00Z', completedAt: '2026-10-02T00:00:00Z' };
const booking = { id: 'bk1', reference: 'INS-100', status: 'booked', paymentStatus: 'pending', vehicle: { year: 2019, make: 'Subaru', model: 'Outback' }, totalPrice: 4500, currency: 'KES', createdAt: '2026-10-05T00:00:00Z', provider: { name: 'AutoCheck' } };

const renderView = (props: Record<string, unknown> = {}) =>
  render(<InspectionsView vehicles={[]} user={user} onOpenAuth={vi.fn()} onOpenInspectionMarketplace={vi.fn()} {...props} />);

describe('InspectionsView', () => {
  beforeEach(() => { getMy.mockReset(); getBookings.mockReset(); getReport.mockReset(); });

  it('a guest sees the service and is asked to sign in for records (and never calls the APIs)', () => {
    const onOpenAuth = vi.fn();
    renderView({ user: null, onOpenAuth });
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /Request a KAYAD inspection/ })[0]);
    expect(onOpenAuth).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: 'My inspections' }));
    expect(screen.getByText(/Sign in to see your inspection requests/)).toBeTruthy();
    expect(getMy).not.toHaveBeenCalled();
    expect(getBookings).not.toHaveBeenCalled();
  });

  it('shows an honest empty state', async () => {
    getMy.mockResolvedValue({ success: true, orders: [] });
    getBookings.mockResolvedValue({ bookings: [] });
    renderView({ initialTab: 'mine' });
    expect(await screen.findByText('No inspections yet')).toBeTruthy();
  });

  it('merges both sources, newest first, with real statuses and actions', async () => {
    getMy.mockResolvedValue({ success: true, orders: [kayadDone] });
    getBookings.mockResolvedValue({ bookings: [booking] });
    renderView({ initialTab: 'mine' });
    const items = await screen.findAllByRole('listitem').then((l) => l.filter((x) => x.querySelector('h3')));
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('2019 Subaru Outback')).toBeTruthy();
    expect(within(items[0]).getByRole('button', { name: 'Pay now' })).toBeTruthy();
    expect(within(items[0]).getByRole('button', { name: 'Cancel booking' })).toBeTruthy();
    expect(within(items[1]).getByText('Report ready')).toBeTruthy();
    expect(within(items[1]).queryByRole('button', { name: 'Pay now' })).toBeNull();
  });

  it('one failing source does not hide the other, and says so', async () => {
    getMy.mockRejectedValue(new Error('boom'));
    getBookings.mockResolvedValue({ bookings: [booking] });
    renderView({ initialTab: 'mine' });
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
    expect(screen.getByText('2019 Subaru Outback')).toBeTruthy();
    expect(screen.queryByText('No inspections yet')).toBeNull();
  });

  it('both sources failing is an error with retry, never an empty state', async () => {
    getMy.mockRejectedValue(new Error('x'));
    getBookings.mockRejectedValue(new Error('y'));
    renderView({ initialTab: 'mine' });
    await screen.findByRole('alert');
    expect(screen.queryByText('No inspections yet')).toBeNull();
    getMy.mockResolvedValue({ success: true, orders: [] });
    getBookings.mockResolvedValue({ bookings: [] });
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('No inspections yet')).toBeTruthy();
  });

  it('opens a KAYAD report with only stored facts', async () => {
    getMy.mockResolvedValue({ success: true, orders: [kayadDone] });
    getBookings.mockResolvedValue({ bookings: [] });
    renderView({ initialTab: 'reports' });
    fireEvent.click(await screen.findByRole('button', { name: /View report/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('82/100')).toBeTruthy();
    expect(within(dialog).getByText('Solid car')).toBeTruthy();
    expect(within(dialog).queryByText(/Passed|Clean Certification/)).toBeNull();
  });

  it('tabs follow the roving-tabindex keyboard pattern', async () => {
    getMy.mockResolvedValue({ success: true, orders: [] });
    getBookings.mockResolvedValue({ bookings: [] });
    renderView();
    const first = screen.getByRole('tab', { name: 'Get an inspection' });
    expect(first.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = screen.getByRole('tab', { name: 'My inspections' });
    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(second.getAttribute('tabindex')).toBe('0');
    expect(first.getAttribute('tabindex')).toBe('-1');
    await screen.findByText('No inspections yet');
  });

  it('launchAction=request opens the form with the launch vehicle preselected', () => {
    getMy.mockResolvedValue({ success: true, orders: [] });
    getBookings.mockResolvedValue({ bookings: [] });
    const vehicle = { id: 'c9', title: 'Launch Vehicle', make: 'T', model: 'M', year: 2020, price: 1, location: 'Nairobi', images: [] } as never;
    renderView({ launchAction: 'request', initialSelectedVehicle: vehicle, vehicles: [vehicle] });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Launch Vehicle')).toBeTruthy();
  });
});
