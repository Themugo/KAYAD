import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const getMyInspections = vi.fn();
vi.mock('../../services/inspectionApi', () => ({ getMyInspections: (...a: unknown[]) => getMyInspections(...a) }));

import { VehicleInspectionSection } from '../../components/detail/VehicleInspectionSection';
import { INITIAL_VEHICLES } from '../fixtures/mockVehicles';

const vehicle = { ...INITIAL_VEHICLES[0], id: 'car-1', inspectionPassed: false } as any;

describe('VehicleInspectionSection (inspection lives on vehicle details)', () => {
  beforeEach(() => { getMyInspections.mockReset(); });

  it('visitor: says no report is attached and offers booking through the existing flow', () => {
    const onRequestInspection = vi.fn();
    render(<VehicleInspectionSection vehicle={vehicle} viewer={null} onRequestInspection={onRequestInspection} />);
    expect(screen.getByTestId('inspection-listing-status').textContent).toContain('No inspection report is attached');
    fireEvent.click(screen.getByRole('button', { name: /Book an inspection of this vehicle/ }));
    expect(onRequestInspection).toHaveBeenCalledWith(vehicle);
    expect(getMyInspections).not.toHaveBeenCalled();
  });

  it('never claims the vehicle was inspected unless the listing says so', () => {
    render(<VehicleInspectionSection vehicle={vehicle} viewer={null} onRequestInspection={() => {}} />);
    expect(document.body.textContent).not.toMatch(/passed an inspection|inspection completed/i);
  });

  it.each([
    ['pending_payment', 'Inspection requested'],
    ['assigned', 'Inspector assigned'],
    ['in_progress', 'Inspection in progress'],
    ['completed', 'Inspection completed'],
  ])('signed-in buyer with a %s booking for THIS vehicle sees "%s" and no duplicate booking button', async (status, label) => {
    getMyInspections.mockResolvedValue({ success: true, orders: [{ id: 'o1', status, car: { id: 'car-1' } }, { id: 'o2', status: 'completed', car: { id: 'other' } }] });
    render(<VehicleInspectionSection vehicle={vehicle} viewer={{ id: 'u1' }} onRequestInspection={() => {}} onViewMyInspections={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('inspection-booking-status').textContent).toContain(label));
    expect(screen.queryByRole('button', { name: /Book an inspection/ })).toBeNull();
  });

  it('a booking for a different vehicle does not change this vehicle\'s state', async () => {
    getMyInspections.mockResolvedValue({ success: true, orders: [{ id: 'o2', status: 'completed', car: { id: 'other' } }] });
    render(<VehicleInspectionSection vehicle={vehicle} viewer={{ id: 'u1' }} onRequestInspection={() => {}} />);
    await waitFor(() => expect(getMyInspections).toHaveBeenCalled());
    expect(screen.queryByTestId('inspection-booking-status')).toBeNull();
    expect(screen.getByRole('button', { name: /Book an inspection/ })).toBeTruthy();
  });

  it('completed booking links to the buyer\'s own reports, not report content', async () => {
    getMyInspections.mockResolvedValue({ success: true, orders: [{ id: 'o1', status: 'completed', car: { id: 'car-1' } }] });
    const onView = vi.fn();
    render(<VehicleInspectionSection vehicle={vehicle} viewer={{ id: 'u1' }} onViewMyInspections={onView} />);
    fireEvent.click(await screen.findByRole('button', { name: /View my inspection report/ }));
    expect(onView).toHaveBeenCalledWith('reports');
  });

  it('own listing: no booking is offered and the bookings list is not fetched', () => {
    render(<VehicleInspectionSection vehicle={vehicle} viewer={{ id: 'u1' }} isOwnListing onRequestInspection={() => {}} />);
    expect(screen.queryByRole('button', { name: /Book an inspection/ })).toBeNull();
    expect(getMyInspections).not.toHaveBeenCalled();
  });

  it('a failed bookings lookup degrades gracefully and keeps booking available', async () => {
    getMyInspections.mockRejectedValue(new Error('down'));
    render(<VehicleInspectionSection vehicle={vehicle} viewer={{ id: 'u1' }} onRequestInspection={() => {}} />);
    await screen.findByText(/could not check your bookings/);
    expect(screen.getByRole('button', { name: /Book an inspection/ })).toBeTruthy();
  });
});
