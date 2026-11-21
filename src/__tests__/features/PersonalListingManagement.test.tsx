// Personal account listing management: numbering, status tabs/counts, Edit Details, Manage Photos (reorder / cover / remove / upload
// validation), Mark as Sold and truthful "why is this disabled" states. Component tests with mocked APIs; the real-database behaviour of
// the same routes is covered by the disposable-database probes recorded in the implementation report.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalSellingModule from '../../features/PrivateSellerPlatform/pages/PersonalSellingModule';

const api = vi.hoisted(() => ({
  updateCar: vi.fn(), deleteCar: vi.fn(), addCarImages: vi.fn(), deleteCarImage: vi.fn(), setCoverImage: vi.fn(), reorderCarImages: vi.fn(), transitionMyListing: vi.fn(),
}));
vi.mock('../../services/vehicleApi', async (orig) => ({ ...(await orig<typeof import('../../services/vehicleApi')>()), ...api }));
vi.mock('../../services/privateSellerCapabilityApi', () => ({
  getMySellerCapability: vi.fn().mockResolvedValue({ status: 'approved', source: 'policy_default', application: null, canApply: false, canList: true }),
  applyForPrivateSelling: vi.fn(),
}));

const eligible = { permissionsAvailable: true, isSellerHidden: false, isPolicyHidden: false, canEdit: true, canManagePhotos: true, canHide: true, canRepublish: false, canMarkSold: true, canRemove: true, reason: '', maxListingImages: 20, maxImagesPerRequest: 10 };
const locked = (reason: string, reasonCode: string) => ({ ...eligible, canEdit: false, canManagePhotos: false, canHide: false, canMarkSold: false, canRemove: false, reason, reasonCode });
const img = (n: number) => ({ url: `https://img.test/${n}.jpg`, public_id: `p/${n}` });
const car = (over: Record<string, unknown>) => ({
  id: 'c', title: 'Car', brand: 'Toyota', model: 'Prado', year: 2018, price: 4000000, mileage: 50000, fuel: 'Diesel', transmission: 'Automatic', city: 'Nairobi',
  status: 'available', approved: true, images: [img(1), img(2), img(3)], ownerActionEligibility: eligible, ...over,
});
const SOLD_REASON = 'This vehicle is marked as sold. Sold listings are kept as a record and can no longer be edited.';
const listings = () => [
  car({ id: 'c4', title: 'Fourth Car', listingNumber: 4 }),
  car({ id: 'c3', title: 'Third Car', listingNumber: 3, status: 'sold', sold: true, ownerActionEligibility: locked(SOLD_REASON, 'SOLD') }),
  car({ id: 'c2', title: 'Second Car', listingNumber: 2, status: 'hidden', ownerActionEligibility: { ...eligible, isSellerHidden: true, canHide: false, canRepublish: true, canEdit: false, canManagePhotos: false, reason: 'This listing is paused. Republish it before editing its details or photos.' } }),
  car({ id: 'c1', title: 'First Car', listingNumber: 1 }),
];

const onRefresh = vi.fn();
const mount = (rows = listings()) => render(<MemoryRouter><PersonalSellingModule user={{ id: 'u1', name: 'J', role: 'user' } as never} initialSection="listing-quality" isEmailVerified={true} listings={rows as never} listingsLoading={false} onRefreshListings={onRefresh} onNavigate={() => {}} /></MemoryRouter>);
const card = (id: string) => document.querySelector(`[data-kayad-listing-card="${id}"]`) as HTMLElement;

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); Object.values(api).forEach((f) => f.mockResolvedValue({ success: true, data: {} })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('listing numbering', () => {
  it('shows the stable server-derived number on every card, starting at 1', async () => {
    mount();
    await screen.findByLabelText('My vehicles and selling tools');
    expect(within(card('c1')).getByTestId('listing-number').textContent).toBe('Listing #1');
    expect(within(card('c2')).getByTestId('listing-number').textContent).toBe('Listing #2');
    expect(within(card('c4')).getByTestId('listing-number').textContent).toBe('Listing #4');
  });
  it('does not renumber when a status filter changes (a sold listing keeps its number)', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /^Sold/ }));
    expect(within(card('c3')).getByTestId('listing-number').textContent).toBe('Listing #3');
    expect(card('c1')).toBeNull();
  });
  it('never invents a number when the server did not supply one', async () => {
    mount([car({ id: 'x', title: 'No Number' })]);
    await screen.findByLabelText('My vehicles and selling tools');
    expect(screen.queryByTestId('listing-number')).toBeNull();
  });
});

describe('status tabs and counts', () => {
  it('counts come from the actual records and match what each tab shows', async () => {
    mount();
    const tab = async (label: RegExp) => screen.findByRole('button', { name: label });
    expect((await tab(/^All/)).textContent).toContain('4');
    expect((await tab(/^Active/)).textContent).toContain('2');
    expect((await tab(/^Sold/)).textContent).toContain('1');
    expect((await tab(/^Paused/)).textContent).toContain('1');
    fireEvent.click(await tab(/^Active/));
    expect(document.querySelectorAll('[data-kayad-listing-card]').length).toBe(2);
    expect(card('c1')).toBeTruthy();
    expect(card('c4')).toBeTruthy();
    expect(card('c3')).toBeNull();
  });
});

describe('Mark as sold', () => {
  it('asks for confirmation, calls the lifecycle route, refreshes and opens the Sold tab', async () => {
    mount();
    fireEvent.click(within(card('c1')).getByRole('button', { name: 'Mark as sold' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(api.transitionMyListing).toHaveBeenCalledWith('c1', 'mark_sold'));
    expect(onRefresh).toHaveBeenCalled();
    expect((await screen.findByRole('status')).textContent).toMatch(/moved to your Sold tab/i);
    expect(screen.getByRole('button', { name: /^Sold/ }).getAttribute('aria-pressed')).toBe('true');
  });
  it('does nothing when the owner declines the confirmation', async () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    mount();
    fireEvent.click(within(card('c1')).getByRole('button', { name: 'Mark as sold' }));
    expect(api.transitionMyListing).not.toHaveBeenCalled();
  });
  it('shows the server refusal (for example an accepted offer awaiting payment) and does not claim success', async () => {
    api.transitionMyListing.mockRejectedValueOnce(new Error('An accepted offer is awaiting payment or has been paid for this vehicle, so its status cannot be changed here.'));
    mount();
    fireEvent.click(within(card('c1')).getByRole('button', { name: 'Mark as sold' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/accepted offer/i);
    expect(screen.queryByText(/moved to your Sold tab/i)).toBeNull();
  });
  it('a sold listing offers no edit/photo/sold actions and states the real reason', async () => {
    mount();
    const sold = card('c3');
    expect(within(sold).queryByRole('button', { name: 'Mark as sold' })).toBeNull();
    expect((within(sold).getByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(sold).getByRole('button', { name: 'Manage photos' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(sold).getByTestId('action-reason').textContent).toBe(SOLD_REASON);
    expect(within(sold).getByText('View listing')).toBeTruthy();
  });
});

describe('Edit details', () => {
  it('saves the permitted fields, preserves the listing and shows a success message', async () => {
    mount();
    fireEvent.click(within(card('c1')).getByRole('button', { name: 'Edit details' }));
    fireEvent.change(screen.getByLabelText(/Asking price/i), { target: { value: '4500000' } });
    fireEvent.change(screen.getByLabelText(/City \/ location/i), { target: { value: 'Mombasa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateCar).toHaveBeenCalled());
    const [id, payload] = api.updateCar.mock.calls[0];
    expect(id).toBe('c1');
    expect(payload).toMatchObject({ price: 4500000, city: 'Mombasa', brand: 'Toyota', model: 'Prado', year: 2018, mileage: 50000 });
    expect(payload).not.toHaveProperty('images');
    expect(payload).not.toHaveProperty('status');
    expect((await screen.findByText('Listing details updated successfully.'))).toBeTruthy();
    expect(onRefresh).toHaveBeenCalled();
  });
  it('validates before sending (price must be greater than zero)', async () => {
    mount();
    fireEvent.click(within(card('c1')).getByRole('button', { name: 'Edit details' }));
    fireEvent.change(screen.getByLabelText(/Asking price/i), { target: { value: '0' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toMatch(/valid asking price/i);
    expect(api.updateCar).not.toHaveBeenCalled();
  });
  it('shows the server message when the save is refused instead of a generic permission warning', async () => {
    api.updateCar.mockRejectedValueOnce(new Error('This listing cannot be changed in its current state.'));
    mount();
    fireEvent.click(within(card('c1')).getByRole('button', { name: 'Edit details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('alert')).textContent).toBe('This listing cannot be changed in its current state.');
  });
  it('a paused listing explains that it must be republished before editing', async () => {
    mount();
    expect(within(card('c2')).getByTestId('action-reason').textContent).toMatch(/Republish it before editing/);
    expect((within(card('c2')).getByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Manage photos', () => {
  const open = async () => { mount(); fireEvent.click(within(card('c1')).getByRole('button', { name: 'Manage photos' })); return screen.findByLabelText('Manage vehicle photos'); };

  it('lists the existing photos with the correct count and the cover first', async () => {
    const section = await open();
    expect(within(section).getAllByRole('img').length).toBe(3);
    expect(within(section).getByText('Cover photo')).toBeTruthy();
    expect(within(card('c1')).getByTestId('photo-count').textContent).toBe('3 photos');
  });
  it('reorders photos by sending a permutation and confirms the saved order', async () => {
    const section = await open();
    fireEvent.click(within(section).getByRole('button', { name: 'Move photo 1 later' }));
    await waitFor(() => expect(api.reorderCarImages).toHaveBeenCalledWith('c1', [1, 0, 2], ['p/1', 'p/2', 'p/3']));
    expect((await screen.findByText(/moved to the front|order saved/i))).toBeTruthy();
    expect(onRefresh).toHaveBeenCalled();
  });
  it('moving a photo to the front makes it the cover; the first photo cannot move earlier', async () => {
    const section = await open();
    expect((within(section).getByRole('button', { name: 'Move photo 1 earlier' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(section).getByRole('button', { name: 'Move photo 3 later' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(section).getByRole('button', { name: 'Move photo 2 earlier' }));
    await waitFor(() => expect(api.reorderCarImages).toHaveBeenCalledWith('c1', [1, 0, 2], ['p/1', 'p/2', 'p/3']));
    expect(await screen.findByText(/set as the cover photo/i)).toBeTruthy();
  });
  it('makes a photo the cover through the existing cover route', async () => {
    const section = await open();
    fireEvent.click(within(section).getAllByRole('button', { name: 'Make cover' })[0]);
    await waitFor(() => expect(api.setCoverImage).toHaveBeenCalledWith('c1', 1, 'p/2'));
  });
  it('removes a photo only after confirmation and through the existing delete route', async () => {
    const section = await open();
    fireEvent.click(within(section).getByRole('button', { name: 'Remove photo 2' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(api.deleteCarImage).toHaveBeenCalledWith('c1', 1, 'p/2'));
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    api.deleteCarImage.mockClear();
    fireEvent.click(within(section).getByRole('button', { name: 'Remove photo 3' }));
    expect(api.deleteCarImage).not.toHaveBeenCalled();
  });
  it('refuses to remove the last photo of a submitted listing in the UI before calling the server', async () => {
    mount([car({ id: 'one', title: 'One Photo', images: [img(1)], listingNumber: 1 })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage photos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove photo 1' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/must keep at least one photo/i);
    expect(api.deleteCarImage).not.toHaveBeenCalled();
  });
  it('rejects unsupported files and oversized files without calling the server', async () => {
    const section = await open();
    const input = section.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/JPG, PNG or WebP up to 5 MB/i);
    expect(api.addCarImages).not.toHaveBeenCalled();
  });
  it('uploads valid photos, reports progress through the API callback and confirms success', async () => {
    api.addCarImages.mockImplementationOnce(async (_id: string, _files: File[], onProgress?: (n: number) => void) => { onProgress?.(40); return { success: true, data: {} }; });
    const section = await open();
    const input = section.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(api.addCarImages).toHaveBeenCalledWith('c1', expect.any(Array), expect.any(Function)));
    expect((await screen.findByText(/1 photo uploaded and saved to this listing/i))).toBeTruthy();
  });
  it('a failed upload says the existing photos are unchanged', async () => {
    api.addCarImages.mockRejectedValueOnce(new Error('Failed to add images'));
    const section = await open();
    fireEvent.change(section.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/Upload failed.*existing photos are unchanged/i);
  });
  it('disables photo actions and explains why when the listing is locked', async () => {
    mount([car({ id: 'l', title: 'Locked', listingNumber: 1, ownerActionEligibility: locked('This listing is protected by an auction, bid or transaction. Its details and photos cannot be changed right now.', 'TRANSACTION_LOCK') })]);
    expect((await screen.findByRole('button', { name: 'Manage photos' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('action-reason').textContent).toMatch(/auction, bid or transaction/);
  });
});

describe('permission verification failures', () => {
  const unavailable = { permissionsAvailable: false, isSellerHidden: false, isPolicyHidden: false, canEdit: false, canManagePhotos: false, canHide: false, canRepublish: false, canMarkSold: false, canRemove: false, reasonCode: 'PERMISSION_CHECK_UNAVAILABLE',
    reason: "Listing tools are temporarily unavailable because KAYARD KE could not load this listing's account records. Your listing is unchanged and still visible to you. Try again shortly; if this continues, contact support." };
  it('reports a service fault accurately, offers a retry and never shows the old generic permission warning', async () => {
    mount([car({ id: 'u', title: 'Svc', listingNumber: 1, ownerActionEligibility: unavailable })]);
    const box = await screen.findByTestId('permissions-unavailable');
    expect(box.textContent).toMatch(/temporarily unavailable/i);
    expect(screen.queryByText(/could not verify this listing's permissions/i)).toBeNull();
    fireEvent.click(within(box).getByRole('button', { name: 'Try again' }));
    expect(onRefresh).toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Mark as sold' })).toBeNull();
  });
});

describe('partial availability (hosted databases that predate some tables) and photo identity', () => {
  const statusServiceOff = { ...eligible, canHide: false, canMarkSold: false, lifecycleReasonCode: 'LISTING_STATUS_SERVICE_UNAVAILABLE', degraded: ['lifecycle history'],
    lifecycleReason: 'Pausing, republishing and marking as sold are not enabled on this platform yet. Editing details and managing photos are not affected.' };
  it('Edit details and Manage photos stay actionable while status actions explain why they are unavailable', async () => {
    mount([car({ id: 'p', title: 'Mazda CX5', listingNumber: 1, ownerActionEligibility: statusServiceOff })]);
    await screen.findByLabelText('My vehicles and selling tools');
    expect((screen.getByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Manage photos' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Mark as sold' })).toBeNull();
    expect(screen.getByTestId('lifecycle-reason').textContent).toMatch(/not enabled on this platform yet/i);
    expect(screen.queryByTestId('permissions-unavailable')).toBeNull();
    expect(screen.queryByText(/could not load this listing's account records/i)).toBeNull();
  });
  it('a temporary status-record failure offers Try again next to the status explanation, not a blanket lock', async () => {
    const temp = { ...eligible, canHide: false, canMarkSold: false, lifecycleReasonCode: 'PERMISSION_CHECK_UNAVAILABLE', lifecycleReason: "We could not check this listing's status records just now, so pausing, republishing and marking as sold are paused. Try again." };
    mount([car({ id: 'p', title: 'T', listingNumber: 1, ownerActionEligibility: temp })]);
    const note = await screen.findByTestId('lifecycle-reason');
    fireEvent.click(within(note).getByRole('button', { name: 'Try again' }));
    expect(onRefresh).toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('after a successful retry the controls are enabled again (no indefinitely disabled state)', async () => {
    const down = { ...locked('Listing tools are temporarily unavailable. Try again.', 'PERMISSION_CHECK_UNAVAILABLE'), permissionsAvailable: false };
    const view = mount([car({ id: 'r', title: 'R', listingNumber: 1, ownerActionEligibility: down })]);
    expect((await screen.findByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<MemoryRouter><PersonalSellingModule user={{ id: 'u1', name: 'J', role: 'user' } as never} initialSection="listing-quality" isEmailVerified={true} listings={[car({ id: 'r', title: 'R', listingNumber: 1 })] as never} listingsLoading={false} onRefreshListings={onRefresh} onNavigate={() => {}} /></MemoryRouter>);
    expect((await screen.findByRole('button', { name: 'Edit details' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId('permissions-unavailable')).toBeNull();
  });
  it('the photo manager still works on a degraded-but-permitted listing and names the photo it acts on', async () => {
    mount([car({ id: 'p', title: 'Mazda CX5', listingNumber: 1, ownerActionEligibility: statusServiceOff })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage photos' }));
    const section = await screen.findByLabelText('Manage vehicle photos');
    fireEvent.click(within(section).getByRole('button', { name: 'Remove photo 3' }));
    await waitFor(() => expect(api.deleteCarImage).toHaveBeenCalledWith('p', 2, 'p/3'));
  });
});
