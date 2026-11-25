import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const getDealerProfile = vi.fn();
const apiGet = vi.fn();
vi.mock('../../services/dealerPlatformApi', () => ({ getDealerProfile: (...a: unknown[]) => getDealerProfile(...a) }));
vi.mock('../../api/httpClient', () => ({ api: { get: (...a: unknown[]) => apiGet(...a) } }));

import { DealerProfilePage } from '../../components/dealer/DealerProfilePage';

const profile = { success: true, data: { id: 'd1', businessName: 'Amani Motors', bio: 'Family-run showroom.', location: 'Westlands, Nairobi', logoUrl: 'https://res.cloudinary.com/demo/logo.png', bannerUrl: null, verified: true, memberSince: '2024-03-01T00:00:00Z', stats: { activeListings: 1, averageRating: null, totalReviews: 0 } } };

beforeEach(() => { getDealerProfile.mockReset(); apiGet.mockReset(); });

describe('public dealer storefront', () => {
  it('shows business details, verified badge and published vehicles linking to the vehicle page', async () => {
    getDealerProfile.mockResolvedValue(profile);
    apiGet.mockResolvedValue({ data: { data: [{ id: 'c1', title: '2019 Toyota Prado', price: 4500000, year: 2019, mileage: 52000, city: 'Nairobi', coverImage: 'https://res.cloudinary.com/demo/c1.jpg' }] } });
    render(<DealerProfilePage dealerId="d1" />);
    expect(await screen.findByRole('heading', { name: /Amani Motors/ })).toBeTruthy();
    expect(screen.getByText('Verified dealer')).toBeTruthy();
    expect(screen.getByText('Family-run showroom.')).toBeTruthy();
    const link = screen.getByRole('link', { name: /2019 Toyota Prado/ });
    expect(link.getAttribute('href')).toBe('/cars/c1');
    expect(apiGet).toHaveBeenCalledWith('/cars', { params: { dealer: 'd1', limit: 48 } });
    expect(screen.getByRole('link', { name: /Contact dealer/ }).getAttribute('href')).toBe('/cars/c1');
  });
  it('does not show the verified badge for an unverified preview', async () => {
    getDealerProfile.mockResolvedValue({ ...profile, data: { ...profile.data, verified: false } });
    apiGet.mockResolvedValue({ data: { data: [] } });
    render(<DealerProfilePage dealerId="d1" />);
    await screen.findByRole('heading', { name: /Amani Motors/ });
    expect(screen.queryByText('Verified dealer')).toBeNull();
    expect(screen.getByText(/No vehicles are listed/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Contact dealer' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('renders a calm not-available page for a 404 (pending, suspended or unknown dealer)', async () => {
    getDealerProfile.mockRejectedValue({ response: { status: 404 } });
    render(<DealerProfilePage dealerId="nope" />);
    expect(await screen.findByText(/isn’t available/)).toBeTruthy();
    expect(apiGet).not.toHaveBeenCalled();
  });
  it('shows a retryable error when the profile cannot be loaded', async () => {
    getDealerProfile.mockRejectedValue({ response: { status: 500 } });
    render(<DealerProfilePage dealerId="d1" />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
  it('keeps the profile visible and says so when only the inventory fails', async () => {
    getDealerProfile.mockResolvedValue(profile);
    apiGet.mockRejectedValue(new Error('network'));
    render(<DealerProfilePage dealerId="d1" />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/couldn’t load the vehicles/));
    expect(screen.getByRole('heading', { name: /Amani Motors/ })).toBeTruthy();
  });
});
