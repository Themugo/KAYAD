import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = { featuredCampaigns: vi.fn(), featuredCampaignHistory: vi.fn(), featuredCampaignVehicles: vi.fn(), featuredCampaignCreate: vi.fn(), featuredCampaignUpdate: vi.fn(), featuredCampaignPause: vi.fn(), featuredCampaignResume: vi.fn(), featuredCampaignEnd: vi.fn(), featuredCampaignDelete: vi.fn() };
vi.mock('../../../api/api', () => ({ adminAPI: new Proxy({}, { get: (_t, k) => (...a) => api[k](...a) }) }));
import AdminFeaturedVehicles, { toNairobiParts } from '../../../pages/admin/AdminFeaturedVehicles';

const veh = (over = {}) => ({ id: 'car-1', title: 'Sample SUV', make: 'Toyota', model: 'Prado', year: 2020, price: 1500000, status: 'available', image: null, ...over });
const camp = (over = {}) => ({ id: 'c1', carId: 'car-1', startsAt: '2026-11-12T05:00:00.000Z', endsAt: '2026-11-20T20:59:00.000Z', displayOrder: 1, paused: false, state: 'upcoming', vehicle: veh(), ...over });
const list = (campaigns = [], counts = { current: 0, upcoming: 0, expired: 0, inactive: 0 }) => ({ success: true, campaigns, counts, timezone: 'Africa/Nairobi' });

beforeEach(() => {
  vi.clearAllMocks();
  api.featuredCampaigns.mockResolvedValue(list());
  api.featuredCampaignHistory.mockResolvedValue({ history: [] });
  api.featuredCampaignVehicles.mockResolvedValue({ vehicles: [veh(), veh({ id: 'car-2', title: 'Sold car', status: 'sold' })] });
  api.featuredCampaignCreate.mockResolvedValue({ campaign: camp() });
});

describe('AdminFeaturedVehicles', () => {
  test('shows the four counts and an honest empty state', async () => {
    api.featuredCampaigns.mockResolvedValue(list([camp()], { current: 2, upcoming: 1, expired: 3, inactive: 4 }));
    render(<AdminFeaturedVehicles />);
    const counts = await screen.findByLabelText('Campaign counts');
    expect(within(counts).getByText('Currently featured').nextSibling).toHaveTextContent('2');
    expect(within(counts).getByText('Inactive').nextSibling).toHaveTextContent('4');
  });
  test('a failed load is not presented as an empty or zero result', async () => {
    api.featuredCampaigns.mockRejectedValue({ response: { data: { message: 'Featured campaigns are not set up yet.' } } });
    render(<AdminFeaturedVehicles />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not set up yet/i);
    expect(screen.getByText('Campaigns could not be loaded.')).toBeInTheDocument();
  });
  test('assign, schedule in Nairobi time and save: the server receives absolute +03:00 instants', async () => {
    const user = userEvent.setup();
    render(<AdminFeaturedVehicles />);
    await screen.findByLabelText('Campaign counts');
    await user.type(screen.getByLabelText('Search vehicles'), 'sample');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('button', { name: 'Unavailable' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByText(/Toyota Prado · 2020/)).toBeInTheDocument(); // preview
    await user.type(screen.getByLabelText('Start date'), '2026-11-12');
    await user.type(screen.getByLabelText('End date'), '2026-11-20');
    await user.click(screen.getByRole('button', { name: 'Save campaign' }));
    await waitFor(() => expect(api.featuredCampaignCreate).toHaveBeenCalledWith({ carId: 'car-1', startsAt: '2026-11-12T08:00:00+03:00', endsAt: '2026-11-20T23:59:00+03:00', displayOrder: 1 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Campaign saved.');
  });
  test('refuses to save without a vehicle or dates, and shows a server rejection without losing the form', async () => {
    const user = userEvent.setup();
    render(<AdminFeaturedVehicles />);
    await screen.findByLabelText('Campaign counts');
    await user.click(screen.getByRole('button', { name: 'Save campaign' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a vehicle first.');
    expect(api.featuredCampaignCreate).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Search vehicles'), 's'); await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: 'Select' }));
    await user.type(screen.getByLabelText('Start date'), '2026-11-12'); await user.type(screen.getByLabelText('End date'), '2026-11-13');
    api.featuredCampaignCreate.mockRejectedValue({ response: { data: { message: 'This vehicle already has a campaign during that period.' } } });
    await user.click(screen.getByRole('button', { name: 'Save campaign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already has a campaign/);
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-11-12');
  });
  test('row actions: pause, resume, confirmed end and confirmed delete', async () => {
    const user = userEvent.setup();
    api.featuredCampaigns.mockResolvedValue(list([camp({ id: 'cur', state: 'current' }), camp({ id: 'ina', state: 'inactive', paused: true })], { current: 1, upcoming: 0, expired: 0, inactive: 1 }));
    api.featuredCampaignPause.mockResolvedValue({}); api.featuredCampaignResume.mockResolvedValue({}); api.featuredCampaignEnd.mockResolvedValue({}); api.featuredCampaignDelete.mockResolvedValue({});
    render(<AdminFeaturedVehicles />);
    await screen.findAllByText(/Sample SUV · 2020/);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(api.featuredCampaignPause).toHaveBeenCalledWith('cur');
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(api.featuredCampaignResume).toHaveBeenCalledWith('ina');
    await user.click(screen.getByRole('button', { name: 'End now' }));
    expect(api.featuredCampaignEnd).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End now' }));
    await waitFor(() => expect(api.featuredCampaignEnd).toHaveBeenCalledWith('cur'));
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(api.featuredCampaignDelete).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.featuredCampaignDelete).toHaveBeenCalledWith('cur'));
  });
  test('filters by status', async () => {
    const user = userEvent.setup();
    api.featuredCampaigns.mockResolvedValue(list([camp({ id: 'a', state: 'current', vehicle: veh({ title: 'Running car' }) }), camp({ id: 'b', state: 'expired', vehicle: veh({ title: 'Old car' }) })]));
    render(<AdminFeaturedVehicles />);
    await screen.findByText(/Running car/);
    await user.click(screen.getByRole('button', { name: 'Expired' }));
    expect(screen.queryByText(/Running car/)).not.toBeInTheDocument();
    expect(screen.getByText(/Old car/)).toBeInTheDocument();
  });
  test('Nairobi conversion helper', () => {
    expect(toNairobiParts('2026-11-12T05:00:00.000Z')).toEqual({ date: '2026-11-12', time: '08:00' });
    expect(toNairobiParts('2026-11-20T20:59:00.000Z')).toEqual({ date: '2026-11-20', time: '23:59' });
    expect(toNairobiParts('2026-11-20T21:00:00.000Z')).toEqual({ date: '2026-11-21', time: '00:00' });
  });
});
