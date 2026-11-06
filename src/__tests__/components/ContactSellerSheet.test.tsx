import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ getCarById: vi.fn() }));
vi.mock('../../services/vehicleApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/vehicleApi')>('../../services/vehicleApi');
  return { ...actual, getCarById: api.getCarById };
});
import ContactSellerSheet, { toWhatsAppNumber } from '../../features/VehicleMarketplace/components/ContactSellerSheet';

const car = (phone?: string) => ({ id: 'c1', title: 'T', brand: 'Toyota', model: 'Prado', year: 2020, price: 1, status: 'available', images: [], dealer: { id: 'd', name: 'Jane Motors', phone, role: 'dealer' } });
const open = () => render(<ContactSellerSheet vehicleId="c1" title="2020 Toyota Prado" onClose={vi.fn()} onOpenListing={vi.fn()} />);

describe('ContactSellerSheet (no account needed)', () => {
  beforeEach(() => api.getCarById.mockReset());

  it('offers Call and WhatsApp straight from the public listing record', async () => {
    api.getCarById.mockResolvedValue(car('0712 345 678'));
    open();
    const call = await screen.findByRole('link', { name: /Call/ });
    expect(call.getAttribute('href')).toBe('tel:0712 345 678');
    const wa = screen.getByRole('link', { name: /WhatsApp/ });
    expect(wa.getAttribute('href')).toContain('https://wa.me/254712345678?text=');
  });

  it('says plainly when the seller shares no number and still offers the listing', async () => {
    api.getCarById.mockResolvedValue(car(undefined));
    const onOpenListing = vi.fn();
    render(<ContactSellerSheet vehicleId="c1" title="x" onClose={vi.fn()} onOpenListing={onOpenListing} />);
    await screen.findByText(/has not shared a phone number/);
    expect(screen.queryByRole('link', { name: /Call/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /View full listing/ }));
    expect(onOpenListing).toHaveBeenCalled();
  });

  it('shows an honest message when the listing cannot be loaded', async () => {
    api.getCarById.mockResolvedValue(null);
    open();
    await screen.findByText(/could not load the seller details/);
  });

  it('normalises Kenyan numbers for WhatsApp', () => {
    expect(toWhatsAppNumber('0712 345 678')).toBe('254712345678');
    expect(toWhatsAppNumber('+254 712 345 678')).toBe('254712345678');
    expect(toWhatsAppNumber('712345678')).toBe('254712345678');
    expect(toWhatsAppNumber('12')).toBe('');
  });
});
