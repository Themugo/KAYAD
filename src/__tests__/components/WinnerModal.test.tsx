import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WinnerModal from '../../components/features/auction/WinnerModal';

const cert = { certificateNumber: 'KAY-AUC-2026-05752BF6', issuedAt: '2026-11-04T08:00:00Z', bidderId: 'K-AAAA1111', vehicle: { title: 'Toyota Hilux', year: 2021 },
  financials: { winningBid: 2100000, commitmentCredited: 5000, balanceDue: 2095000, paymentDueAt: '2026-11-05T08:00:00Z' } };

describe('WinnerModal', () => {
  it('renders nothing without a certificate', () => {
    const { container } = render(<WinnerModal certificate={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('is an accessible dialog with the certificate facts, anonymous bidder ID and balance due', () => {
    render(<WinnerModal certificate={cert} onClose={() => {}} onPayBalance={() => {}} />);
    expect(screen.getByRole('dialog', { name: /winner certificate/i })).toBeInTheDocument();
    expect(screen.getByText('KAY-AUC-2026-05752BF6')).toBeInTheDocument();
    expect(screen.getByText('K-AAAA1111')).toBeInTheDocument();
    expect(screen.getByText(/2,095,000/)).toBeInTheDocument();
    expect(screen.getByText('Pay balance')).toBeInTheDocument();
  });
  it('closes on Escape and the close button; print uses the browser print dialog', () => {
    const onClose = vi.fn(); const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<WinnerModal certificate={cert} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Close certificate'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText(/Print \/ save as PDF/));
    expect(print).toHaveBeenCalled();
  });
  it('hides Pay balance when nothing is due', () => {
    render(<WinnerModal certificate={{ ...cert, financials: { ...cert.financials, balanceDue: 0 } }} onPayBalance={() => {}} />);
    expect(screen.queryByText('Pay balance')).toBeNull();
  });
});
