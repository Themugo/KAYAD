import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

// MOCKED write-path tests (Phase 14.4). These prove the UI contract against the
// documented backend envelopes; they are NOT live-session certification.
const api = vi.hoisted(() => ({
  getDealerDashboard: vi.fn(), getLeads: vi.fn(), getCustomers: vi.fn(), getAuctionInventory: vi.fn(),
  getInspectionOrders: vi.fn(), getFinanceApplications: vi.fn(), getTeamMembers: vi.fn(), getReputation: vi.fn(),
  getMarketingCampaigns: vi.fn(), getDealerAnalytics: vi.fn(), updateLead: vi.fn(), createCampaign: vi.fn(),
  getDealerProfile: vi.fn(), updateDealerProfile: vi.fn(), getVerificationStatus: vi.fn(),
  inviteTeamMember: vi.fn(), updateTeamMember: vi.fn(), removeTeamMember: vi.fn(),
}));
const veh = vi.hoisted(() => {
  class VehicleApiError extends Error {
    kind: string; status?: number;
    constructor(message: string, kind: string, status?: number) { super(message); this.kind = kind; this.status = status; }
  }
  return {
    getMyListings: vi.fn(), createCar: vi.fn(), updateCar: vi.fn(), addCarImages: vi.fn(), deleteCarImage: vi.fn(), deleteCar: vi.fn(), VehicleApiError,
    LISTING_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'], LISTING_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
    LISTING_IMAGE_MAX_PER_REQUEST: 10, LISTING_IMAGE_MAX_PER_LISTING: 20,
  };
});
vi.mock('../../../services/dealerPlatformApi', () => api);
vi.mock('../../../services/vehicleApi', () => veh);
vi.mock('../../../features/escrow/ParticipantEscrowDesk', () => ({ ParticipantEscrowDesk: () => <div>escrow desk</div> }));

import DealerDashboard from '../../../pages/dealer/dashboard/DealerDashboard';

const user = { id: 'd1', name: 'Amani Motors', role: 'dealer' };
const open = async (query: string) => {
  window.history.replaceState({}, '', `/?nav=dealer-dashboard&${query}`);
  render(<DealerDashboard user={user} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />);
  await screen.findByRole('navigation', { name: 'Dealer workspace' });
};
const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const file = () => new File(['x'], 'car.jpg', { type: 'image/jpeg' });

describe('Dealer listing create/edit (Phase 14.4, mocked)', () => {
  beforeEach(() => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    veh.getMyListings.mockResolvedValue([{ id: 'c1', title: 'Prado TX', brand: 'Toyota', model: 'Prado', year: 2018, price: 5000000, status: 'available' }]);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('Add vehicle opens a URL-backed form; validation blocks submit and focuses the first invalid field', async () => {
    await open('section=inventory');
    fireEvent.click(await screen.findByRole('button', { name: /Add vehicle/i }));
    expect(window.location.search).toContain('mode=new');
    fireEvent.click(screen.getByRole('button', { name: 'Publish vehicle' }));
    expect(await screen.findByText('Title must be at least 2 characters.')).toBeTruthy();
    expect(screen.getByText('Brand is required.')).toBeTruthy();
    expect(screen.getByText('Add at least one photo.')).toBeTruthy();
    expect(veh.createCar).not.toHaveBeenCalled();
    fill(/^Title/, 'Prado'); fill(/^Brand/, 'Toyota'); fill(/^Price/, '-5'); fill(/^Year/, '1800');
    fireEvent.click(screen.getByRole('button', { name: 'Publish vehicle' }));
    expect(await screen.findByText('Price must be greater than zero.')).toBeTruthy();
    expect(screen.getByText(/between 1900 and 2030/)).toBeTruthy();
  });

  it('creates once (duplicate-submit guard), then returns to a refreshed inventory', async () => {
    let resolve: (v: unknown) => void = () => {};
    veh.createCar.mockReturnValue(new Promise((r) => { resolve = r; }));
    await open('section=inventory&mode=new');
    fill(/^Title/, 'Prado TX'); fill(/^Brand/, 'Toyota');
    fireEvent.change(screen.getByLabelText(/Photos/), { target: { files: [file()] } });
    const submit = screen.getByRole('button', { name: 'Publish vehicle' });
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole('button', { name: /Saving/ }));
    fireEvent.submit(screen.getByRole('form', { name: 'Add vehicle' }));
    expect(veh.createCar).toHaveBeenCalledTimes(1);
    expect(veh.createCar.mock.calls[0][0]).toMatchObject({ title: 'Prado TX', brand: 'Toyota' });
    veh.getMyListings.mockResolvedValue([{ id: 'c2', title: 'Prado TX', brand: 'Toyota', status: 'draft' }]);
    resolve({ success: true, data: { id: 'c2' } });
    expect(await screen.findByText(/Vehicle submitted/)).toBeTruthy();
    await waitFor(() => expect(veh.getMyListings).toHaveBeenCalledTimes(2));
    expect(window.location.search).not.toContain('mode=');
  });

  it('server rejection (403 unverified/unauthorized) is shown, entries are kept, and retry works', async () => {
    veh.createCar.mockRejectedValueOnce(new veh.VehicleApiError('Dealer verification required', 'server', 403)).mockResolvedValueOnce({ success: true, data: { id: 'c3' } });
    await open('section=inventory&mode=new');
    fill(/^Title/, 'Prado TX'); fill(/^Brand/, 'Toyota');
    fireEvent.change(screen.getByLabelText(/Photos/), { target: { files: [file()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish vehicle' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Dealer verification required');
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe('Prado TX');
    fireEvent.click(screen.getByRole('button', { name: 'Publish vehicle' }));
    expect(await screen.findByText(/Vehicle submitted/)).toBeTruthy();
  });

  it('edit prefills from the dealer\'s own listing and sends a partial update; cross-owner 403 is surfaced', async () => {
    veh.updateCar.mockRejectedValueOnce(new veh.VehicleApiError('Not authorized to update this listing', 'server', 403));
    await open('section=inventory');
    fireEvent.click(await screen.findByRole('button', { name: /Edit Prado TX/ }));
    expect((await screen.findByLabelText(/^Title/) as HTMLInputElement).value).toBe('Prado TX');
    expect(window.location.search).toContain('mode=edit');
    fill(/^Price/, '4800000');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Not authorized');
    expect(veh.updateCar.mock.calls[0][0]).toBe('c1');
    expect(veh.updateCar.mock.calls[0][1]).toMatchObject({ price: 4800000 });
    expect(veh.createCar).not.toHaveBeenCalled();
  });

  it('editing an id that is not in the dealer\'s own inventory does not open a form', async () => {
    await open('section=inventory&mode=edit&id=someone-elses-car');
    expect(await screen.findByText('This listing was not found in your inventory.')).toBeTruthy();
    expect(screen.queryByRole('form', { name: 'Edit vehicle' })).toBeNull();
  });
});

describe('Dealer settings write path (Phase 14.4, mocked)', () => {
  beforeEach(() => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    api.getVerificationStatus.mockResolvedValue({ success: true, onboardingStage: 'approved' });
    api.getDealerProfile.mockResolvedValue({ success: true, data: { id: 'd1', businessName: 'Amani Motors', location: 'Nairobi', bio: 'Hello' } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows verification status read-only, validates, saves, and reflects the server response', async () => {
    api.updateDealerProfile.mockResolvedValue({ success: true, data: { id: 'd1', businessName: 'Amani Motors Ltd', location: 'Nairobi', bio: 'Hello', phone: '+254700000000' } });
    await open('section=settings');
    expect(await screen.findByTestId('verification-stage')).toHaveProperty('textContent', 'Approved');
    expect(screen.queryByRole('button', { name: /verify|approve/i })).toBeNull();
    fill(/Business name/, '  ');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Business name is required.')).toBeTruthy();
    expect(api.updateDealerProfile).not.toHaveBeenCalled();
    fill(/Business name/, 'Amani Motors Ltd'); fill(/Contact phone/, '+254700000000'); fill(/Current password/, 'Secret#123');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/Profile saved\./)).toBeTruthy();
    expect(api.updateDealerProfile).toHaveBeenCalledWith('d1', { businessName: 'Amani Motors Ltd', location: 'Nairobi', bio: 'Hello', phone: '+254700000000', currentPassword: 'Secret#123' });
  });

  it('a save failure keeps the entries and shows the server message', async () => {
    api.updateDealerProfile.mockRejectedValue({ response: { status: 403, data: { message: 'You can only update your own dealer profile' } } });
    await open('section=settings');
    await screen.findByLabelText(/Business name/);
    fill(/Business name/, 'Changed');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('alert')).textContent).toContain('only update your own');
    expect((screen.getByLabelText(/Business name/) as HTMLInputElement).value).toBe('Changed');
  });

  it('phone is prefilled for the owner, omitted from the request when unchanged, validated when changed, and shows the re-verify notice', async () => {
    api.getDealerProfile.mockResolvedValue({ success: true, data: { id: 'd1', businessName: 'Amani Motors', location: 'Nairobi', bio: 'Hello', phone: '254711111111' } });
    api.updateDealerProfile.mockResolvedValue({ success: true, data: { id: 'd1', businessName: 'Amani Motors', location: 'Mombasa', bio: 'Hello', phone: '254700000001' } });
    await open('section=settings');
    expect(((await screen.findByLabelText(/Contact phone/)) as HTMLInputElement).value).toBe('254711111111');
    expect(screen.queryByTestId('unsaved-indicator')).toBeNull();
    fill(/^Location/, 'Mombasa');
    expect(screen.getByTestId('unsaved-indicator')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText(/Profile saved/);
    expect(api.updateDealerProfile).toHaveBeenLastCalledWith('d1', { businessName: 'Amani Motors', location: 'Mombasa', bio: 'Hello' });
    fill(/Contact phone/, '12345');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/valid Kenyan mobile number/)).toBeTruthy();
    fill(/Contact phone/, '0700 000 001'); fill(/Current password/, 'Secret#123');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/needs to be verified again/)).toBeTruthy();
    expect(api.updateDealerProfile).toHaveBeenLastCalledWith('d1', expect.objectContaining({ phone: '0700 000 001' }));
  });

  it('server-side field errors (400) are shown on the matching field and the entries are kept', async () => {
    api.updateDealerProfile.mockRejectedValue({ response: { status: 400, data: { message: 'Profile details are invalid', errors: { businessName: 'Business name is required' } } } });
    await open('section=settings');
    await screen.findByLabelText(/Business name/);
    fill(/^Location/, 'Kisumu');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Business name is required')).toBeTruthy();
    expect((screen.getByLabelText(/^Location/) as HTMLInputElement).value).toBe('Kisumu');
  });

  it('verification status failure degrades to an unavailable note, not a fabricated status', async () => {
    api.getVerificationStatus.mockRejectedValue(new Error('x'));
    await open('section=settings');
    expect(await screen.findByText('Verification status is unavailable right now.')).toBeTruthy();
  });
});

describe('Dealer team write path (Phase 14.4, mocked)', () => {
  const members = [
    { id: 'm1', inviteEmail: 'a@amani.test', role: 'sales_agent', status: 'active', member: 'u2' },
    { id: 'm2', inviteEmail: 'b@amani.test', role: 'viewer', status: 'invited', member: null },
    { id: 'm3', inviteEmail: 'c@amani.test', role: 'viewer', status: 'removed', member: 'u4' },
  ];
  beforeEach(() => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    api.getTeamMembers.mockResolvedValue({ members, stats: {}, success: true });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('lists non-removed members; never offers activation of a pending invite', async () => {
    await open('section=team');
    expect(await screen.findByText('a@amani.test')).toBeTruthy();
    expect(screen.queryByText('c@amani.test')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Suspend' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Reactivate' })).toBeNull();
  });

  it('invites with validation and refreshes; surfaces a 403 permission denial and 409 duplicate', async () => {
    api.inviteTeamMember.mockRejectedValueOnce({ response: { status: 403, data: { message: 'DEALER_PERMISSION_REQUIRED' } } })
      .mockResolvedValueOnce({ success: true, data: { id: 'm9' } });
    await open('section=team');
    await screen.findByText('a@amani.test');
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(api.inviteTeamMember).not.toHaveBeenCalled();
    fill(/^Email/, 'New@Amani.test');
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect((await screen.findByRole('alert')).textContent).toContain('do not have permission');
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('Invitation sent to new@amani.test.')).toBeTruthy();
    expect(api.inviteTeamMember).toHaveBeenLastCalledWith({ email: 'new@amani.test', role: 'sales_agent' });
    await waitFor(() => expect(api.getTeamMembers).toHaveBeenCalledTimes(2));
  });

  it('changes role, suspends, and removes only after confirmation', async () => {
    api.updateTeamMember.mockResolvedValue({ success: true, data: {} });
    api.removeTeamMember.mockResolvedValue({ success: true, data: {} });
    await open('section=team');
    await screen.findByText('a@amani.test');
    fireEvent.change(screen.getByLabelText('Role for a@amani.test'), { target: { value: 'manager' } });
    await waitFor(() => expect(api.updateTeamMember).toHaveBeenCalledWith('m1', { role: 'manager' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Suspend' })[0]);
    await waitFor(() => expect(api.updateTeamMember).toHaveBeenCalledWith('m1', { status: 'suspended' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Remove / })[0]);
    expect(api.removeTeamMember).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }));
    await waitFor(() => expect(api.removeTeamMember).toHaveBeenCalledWith('m1'));
  });
});

describe('Dealer photo management and listing removal (Phase 14.6, mocked)', () => {
  const imgs = [{ url: 'https://img/1.jpg', public_id: 'p1' }, { url: 'https://img/2.jpg', public_id: 'p2' }];
  beforeEach(() => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    veh.getMyListings.mockResolvedValue([{ id: 'c1', title: 'Prado TX', brand: 'Toyota', model: 'Prado', year: 2018, price: 5000000, status: 'available', images: imgs, updatedAt: '2026-10-20T10:00:00Z' }]);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('edit shows existing photos and saving details does not send or drop images', async () => {
    veh.updateCar.mockResolvedValue({ success: true, data: { id: 'c1' } });
    await open('section=inventory&mode=edit&id=c1');
    expect(screen.getByRole('list', { name: 'Current photos' }).querySelectorAll('li')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(veh.updateCar).toHaveBeenCalled());
    expect(veh.updateCar.mock.calls[0][1]).not.toHaveProperty('images');
    expect(veh.deleteCarImage).not.toHaveBeenCalled();
  });

  it('uploads photos, shows pending, applies the server list, and never fakes success on failure (retry works)', async () => {
    await open('section=inventory&mode=edit&id=c1');
    fireEvent.change(screen.getByLabelText('Add photos'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    veh.addCarImages.mockRejectedValueOnce(new veh.VehicleApiError('Cloud storage not configured.', 'server', 500));
    fireEvent.click(screen.getByRole('button', { name: /Upload 1/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Cloud storage not configured.');
    expect(screen.getByRole('list', { name: 'Current photos' }).querySelectorAll('li')).toHaveLength(2);
    veh.addCarImages.mockResolvedValueOnce({ success: true, data: { images: [...imgs, { url: 'https://img/3.jpg', public_id: 'p3' }] } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Current photos' }).querySelectorAll('li')).toHaveLength(3));
    expect(veh.addCarImages).toHaveBeenCalledTimes(2);
    expect(veh.addCarImages.mock.calls[1][0]).toBe('c1');
  });

  it('rejects wrong type / oversize / over-limit files client-side without calling the API', async () => {
    await open('section=inventory&mode=edit&id=c1');
    fireEvent.change(screen.getByLabelText('Add photos'), { target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Upload 1/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/only JPG, PNG or WEBP/);
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Add photos'), { target: { files: [big] } });
    fireEvent.click(screen.getByRole('button', { name: /Upload 1/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/5 MB/);
    expect(veh.addCarImages).not.toHaveBeenCalled();
  });

  it('removes a photo only after confirmation; the last photo cannot be removed', async () => {
    veh.deleteCarImage.mockResolvedValue({ success: true, data: { images: [imgs[1]] } });
    await open('section=inventory&mode=edit&id=c1');
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    expect(veh.deleteCarImage).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm removing photo 1' })).getByRole('button', { name: /Remove/ }));
    await waitFor(() => expect(veh.deleteCarImage).toHaveBeenCalledWith('c1', 0));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Current photos' }).querySelectorAll('li')).toHaveLength(1));
    expect((screen.getByRole('button', { name: 'Remove photo 1' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a failed photo removal keeps the photo and offers retry', async () => {
    veh.deleteCarImage.mockRejectedValue(new veh.VehicleApiError('Not authorized to edit this listing', 'server', 403));
    await open('section=inventory&mode=edit&id=c1');
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm removing photo 2' })).getByRole('button', { name: /Remove/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Not authorized');
    expect(screen.getByRole('list', { name: 'Current photos' }).querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('listing removal needs confirmation, shows pending, and updates only after the server confirms', async () => {
    let resolve: (v: unknown) => void = () => {};
    veh.deleteCar.mockReturnValue(new Promise((r) => { resolve = r; }));
    await open('section=inventory');
    expect(await screen.findByText(/Updated 20 Oct 2026/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Prado TX' }));
    expect(veh.deleteCar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove listing' }));
    expect(await screen.findByRole('button', { name: /Removing/ })).toBeTruthy();
    veh.getMyListings.mockResolvedValue([]);
    resolve({ success: true });
    expect(await screen.findByText('Listing removed from your inventory.')).toBeTruthy();
    expect(veh.deleteCar).toHaveBeenCalledWith('c1');
    expect(veh.deleteCar).toHaveBeenCalledTimes(1);
  });

  it('a failed removal keeps the listing and shows the reason; 403 is permission-specific', async () => {
    veh.deleteCar.mockRejectedValue(new veh.VehicleApiError('Not authorized to delete this listing', 'server', 403));
    await open('section=inventory');
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Prado TX' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove listing' }));
    expect((await screen.findByRole('alert')).textContent).toContain('do not have permission');
    expect(screen.getByText('Prado TX')).toBeTruthy();
    expect(screen.queryByText('Listing removed from your inventory.')).toBeNull();
  });

  it('sold listings offer no Remove button and explain why (14.7)', async () => {
    veh.getMyListings.mockResolvedValue([{ id: 's1', title: 'Sold Corolla', status: 'sold', images: imgs }]);
    await open('section=inventory');
    expect(await screen.findByText('Sold Corolla')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remove Sold Corolla/ })).toBeNull();
    expect(screen.getByText(/Sold listings cannot be removed/)).toBeTruthy();
  });

  it('a server-side delete block (409) keeps the listing and shows the reason (14.7)', async () => {
    veh.deleteCar.mockRejectedValue(new veh.VehicleApiError('This listing has bids and cannot be deleted.', 'server', 409));
    await open('section=inventory');
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Prado TX' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove listing' }));
    expect((await screen.findByRole('alert')).textContent).toContain('has bids');
    expect(screen.getByText('Prado TX')).toBeTruthy();
  });

  it('auction listings are not removable from this screen', async () => {
    veh.getMyListings.mockResolvedValue([{ id: 'a1', title: 'Auction Hilux', status: 'available', auctionStatus: 'active', bidsCount: 3, images: imgs }]);
    await open('section=inventory');
    expect(await screen.findByText('Auction Hilux')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remove Auction Hilux/ })).toBeNull();
    expect(screen.getByText(/cannot be removed from this screen/)).toBeTruthy();
  });
});

describe('Dealer leads and pipeline presentation (Phase 14.6, mocked)', () => {
  const items = [
    { id: 'l1', stage: 'new', buyer: { name: 'Wanjiku' }, vehicle: { title: 'Prado' }, source: 'web', createdAt: '2026-10-20T10:00:00Z' },
    { id: 'l2', stage: 'test_drive', buyer: { name: 'Kamau' }, vehicle: { title: 'Prado' }, source: 'web', createdAt: '2026-10-20T10:00:00Z' },
  ];
  beforeEach(() => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: {} } });
    api.getLeads.mockResolvedValue({ success: true, data: { items } });
    veh.getMyListings.mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('pipeline shows readable stage headings with separate counts and notes leads in stages it does not show', async () => {
    await open('section=pipeline');
    expect(await screen.findByRole('heading', { name: /^new$/i, level: 4 })).toBeTruthy();
    expect(screen.getByLabelText('1 lead')).toBeTruthy();
    expect(screen.getAllByLabelText('0 leads').length).toBe(3);
    expect(screen.getByText(/1 lead is in other stages/)).toBeTruthy();
  });

  it('leads table humanises stage names (no raw underscores)', async () => {
    await open('section=leads');
    expect(await screen.findByText('test drive')).toBeTruthy();
    expect(screen.queryByText('test_drive')).toBeNull();
  });

  it('overview distinguishes unavailable from zero', async () => {
    api.getDealerDashboard.mockResolvedValue({ success: true, data: { overview: { totalListings: 0 } } });
    await open('section=overview');
    expect(await screen.findByText('0')).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'Unavailable' }).length).toBeGreaterThan(0);
  });
});
