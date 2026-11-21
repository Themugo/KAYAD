import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../../api/api', () => ({ adminAPI: { getDealerListingPolicy: m.get, updateDealerListingPolicy: m.put } }));
import AdminSettingsListing from '../../../pages/admin/AdminSettingsListing';
beforeEach(() => vi.clearAllMocks());

describe('Admin > Settings > Listing & Plans', () => {
  it('defaults to free listing and saves only after a change', async () => {
    m.get.mockResolvedValue({ subscriptionRequired: false });
    m.put.mockResolvedValue({ subscriptionRequired: true, message: 'A subscription is now required to list.' });
    render(<AdminSettingsListing />);
    const box = await screen.findByRole('checkbox', { name: /Require an active subscription/ });
    expect(box).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save listing policy' })).toBeDisabled();
    await userEvent.click(box);
    await userEvent.click(screen.getByRole('button', { name: 'Save listing policy' }));
    expect(m.put).toHaveBeenCalledWith({ subscriptionRequired: true });
    expect(await screen.findByText(/now required/)).toBeInTheDocument();
  });
  it('reports a failed save honestly', async () => {
    m.get.mockResolvedValue({ subscriptionRequired: false });
    m.put.mockRejectedValue({ response: { data: { message: 'nope' } } });
    render(<AdminSettingsListing />);
    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Save listing policy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
  });
  it('offers a reload when settings cannot be loaded', async () => {
    m.get.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ subscriptionRequired: true });
    render(<AdminSettingsListing />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reload settings' }));
    expect(await screen.findByRole('checkbox')).toBeChecked();
  });
});
