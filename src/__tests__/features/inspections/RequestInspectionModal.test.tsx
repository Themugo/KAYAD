import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const createMock = vi.fn();
vi.mock('../../../services/inspectionApi', async (orig) => {
  const actual = await orig<typeof import('../../../services/inspectionApi')>();
  return { ...actual, createInspectionOrder: (...a: unknown[]) => createMock(...a) };
});

import { InspectionApiError } from '../../../services/inspectionApi';
import { RequestInspectionModal } from '../../../features/InspectionsView/RequestInspectionModal';

const v = (id: string, title: string) => ({ id, title, make: 'Toyota', model: 'X', year: 2020, price: 1000000, location: 'Nairobi', images: [] }) as never;
const vehicles = [v('a', 'Prado A'), v('b', 'Subaru B')];

const setup = (props: Record<string, unknown> = {}) => {
  const handlers = { onClose: vi.fn(), onSubmitted: vi.fn(), onViewMyInspections: vi.fn(), onSessionExpired: vi.fn() };
  render(<RequestInspectionModal isOpen vehicles={vehicles} {...handlers} {...props} />);
  return handlers;
};
const fillPhone = (value = '0712345678') => fireEvent.change(screen.getByLabelText('Your phone number'), { target: { value } });

describe('RequestInspectionModal', () => {
  beforeEach(() => { createMock.mockReset(); });

  it('preselects the vehicle the customer came from', () => {
    setup({ initialVehicle: vehicles[1] });
    expect(screen.getByText('Subaru B')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change vehicle' })).toBeTruthy();
  });

  it('never defaults to the first vehicle and blocks submit until a vehicle and a valid phone exist', () => {
    setup();
    const select = screen.getByLabelText('KAYAD marketplace vehicle') as HTMLSelectElement;
    expect(select.value).toBe('');
    fillPhone();
    expect((screen.getByRole('button', { name: 'Submit inspection request' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(select, { target: { value: 'b' } });
    expect((screen.getByRole('button', { name: 'Submit inspection request' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('flags an invalid phone accessibly', () => {
    setup({ initialVehicle: vehicles[0] });
    fillPhone('12');
    fireEvent.blur(screen.getByLabelText('Your phone number'));
    const input = screen.getByLabelText('Your phone number');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toMatch(/valid phone/);
  });

  it('submits once even if the form is submitted twice, and confirms from the server order', async () => {
    let resolve!: (v: unknown) => void;
    createMock.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const h = setup({ initialVehicle: vehicles[0] });
    fillPhone();
    const form = screen.getByRole('button', { name: 'Submit inspection request' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith('a', '0712345678', 'Nairobi');
    resolve({ success: true, order: { id: 'ord-1', status: 'pending_payment', car: { id: 'a', title: 'Prado A' } } });
    await screen.findByText('Your request is saved');
    expect(screen.getByText('ord-1')).toBeTruthy();
    expect(screen.getByText('Request received')).toBeTruthy();
    expect(screen.getByText(/No payment taken/)).toBeTruthy();
    expect(h.onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('does not claim success when the server declines', async () => {
    createMock.mockResolvedValue({ success: false, message: 'Not allowed' });
    const h = setup({ initialVehicle: vehicles[0] });
    fillPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Submit inspection request' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Not allowed/);
    expect(screen.queryByText('Your request is saved')).toBeNull();
    expect(h.onSubmitted).not.toHaveBeenCalled();
  });

  it('offers sign-in on 401 and "view my inspections" on a duplicate (409), keeping the form', async () => {
    createMock.mockRejectedValueOnce(new InspectionApiError('expired', 'unauthenticated', 401));
    const h = setup({ initialVehicle: vehicles[0] });
    fillPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Submit inspection request' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(h.onSessionExpired).toHaveBeenCalled();

    createMock.mockRejectedValueOnce(new InspectionApiError('You already have an active inspection', 'unknown', 409));
    fireEvent.click(screen.getByRole('button', { name: 'Submit inspection request' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'View my inspections' })).toBeTruthy());
    expect((screen.getByLabelText('Your phone number') as HTMLInputElement).value).toBe('0712345678');
  });
});
