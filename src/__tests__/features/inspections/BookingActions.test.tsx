import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const settle = vi.fn();
const cancel = vi.fn();
vi.mock('../../../features/InspectionMarketplace/services/inspectionPayment', async (orig) => ({
  ...(await orig<object>()),
  settleBookingPayment: (...a: unknown[]) => settle(...a),
}));
vi.mock('../../../features/InspectionMarketplace/services/api', () => ({ inspectionApi: { cancelBooking: (...a: unknown[]) => cancel(...a) } }));

import { InspectionPaymentError } from '../../../features/InspectionMarketplace/services/inspectionPayment';
import { CancelBookingModal, PayBookingModal } from '../../../features/InspectionsView/BookingActions';

const record = { key: 'provider:bk1', product: 'provider', reference: 'INS-1', vehicleTitle: '2019 Subaru', bookingId: 'bk1', priceText: 'KSh 4,500', providerName: 'AutoCheck', status: {}, canPay: true, hasReport: false } as never;

describe('PayBookingModal', () => {
  beforeEach(() => { settle.mockReset(); cancel.mockReset(); });

  it('pays the existing booking id, waits for server confirmation, then reloads', async () => {
    let done!: () => void;
    settle.mockImplementation(() => new Promise<void>((r) => { done = r; }));
    const onPaid = vi.fn();
    render(<PayBookingModal record={record} onClose={vi.fn()} onPaid={onPaid} />);
    fireEvent.change(screen.getByLabelText('M-Pesa phone number'), { target: { value: '0712345678' } });
    const form = screen.getByRole('button', { name: 'Send M-Pesa prompt' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls[0][0]).toBe('bk1');
    expect(onPaid).not.toHaveBeenCalled();
    expect(screen.getByText(/do not pay twice/)).toBeTruthy();
    done();
    await screen.findByText('Payment confirmed by KAYAD');
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it('shows the failure and lets the customer retry; never confirms', async () => {
    settle.mockRejectedValue(new InspectionPaymentError('The M-Pesa payment was not completed.', 'failed'));
    render(<PayBookingModal record={record} onClose={vi.fn()} onPaid={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('M-Pesa phone number'), { target: { value: '0712345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send M-Pesa prompt' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/not completed/);
    expect(screen.queryByText('Payment confirmed by KAYAD')).toBeNull();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Send M-Pesa prompt' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('rejects an invalid phone before calling anything', () => {
    render(<PayBookingModal record={record} onClose={vi.fn()} onPaid={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('M-Pesa phone number'), { target: { value: '12' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send M-Pesa prompt' }).closest('form')!);
    expect(settle).not.toHaveBeenCalled();
    expect(screen.getByLabelText('M-Pesa phone number').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('CancelBookingModal', () => {
  beforeEach(() => { cancel.mockReset(); });

  it('cancels the booking with a reason and reports success only after the API resolves', async () => {
    cancel.mockResolvedValue({});
    const onCancelled = vi.fn();
    const onClose = vi.fn();
    render(<CancelBookingModal record={record} onClose={onClose} onCancelled={onCancelled} />);
    fireEvent.change(screen.getByLabelText('Reason (optional)'), { target: { value: 'Changed my mind' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await waitFor(() => expect(onCancelled).toHaveBeenCalled());
    expect(cancel).toHaveBeenCalledWith('bk1', 'Changed my mind');
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the booking and shows the error when the API fails', async () => {
    cancel.mockRejectedValue(new Error('Cannot cancel'));
    const onCancelled = vi.fn();
    render(<CancelBookingModal record={record} onClose={vi.fn()} onCancelled={onCancelled} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Cannot cancel/);
    expect(onCancelled).not.toHaveBeenCalled();
  });
});
