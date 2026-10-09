import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const search = vi.fn();
const taxonomy = vi.fn();
const makes = vi.fn();
const profile = vi.fn();

vi.mock('../../../features/InspectionMarketplace/services/api', () => ({
  inspectionApi: { searchProviders: (...a: unknown[]) => search(...a), getProviderProfile: (...a: unknown[]) => profile(...a) },
  automotiveApi: {
    getServiceTaxonomy: () => taxonomy(),
    getVehicleMakes: () => makes(),
    requestAffiliation: vi.fn(),
  },
}));
vi.mock('../../../features/InspectionMarketplace/pages/BookingFlow', () => ({ default: () => <div>booking</div> }));

import InspectionMarketplacePage from '../../../features/InspectionMarketplace/pages/InspectionMarketplacePage';

const TAX = {
  categories: [
    { code: 'pre_purchase_inspection', label: 'Pre-purchase inspection', description: 'Check before you buy.', highRisk: false, bookable: true, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'diagnostics', label: 'Diagnostics and fault assessment', description: 'Find the fault.', highRisk: false, bookable: false, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'hybrid_ev', label: 'Hybrid and electric vehicles', description: 'High voltage.', highRisk: true, bookable: false, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'roadside_recovery', label: 'Roadside assistance and recovery', description: 'They travel.', highRisk: false, bookable: false, requestable: false, travelsToCustomer: true, subcategories: [] },
  ],
  powertrains: [{ code: 'petrol', label: 'Petrol' }, { code: 'electric', label: 'Electric' }],
  symptoms: [{ code: 'warning_light', label: 'A warning light is on', suggests: ['diagnostics'] }, { code: 'broken_down', label: "I'm broken down", suggests: ['roadside_recovery'] }],
};

const prov = (o: Record<string, unknown> = {}) => ({
  id: 'p1', companyName: 'Acme Garage', location: { country: 'Kenya', county: 'Nairobi', town: 'Westlands' },
  operatingModel: { hasWorkshop: true, offersMobile: false, mobileFee: 0, weekendAvailable: false, sameDayAvailable: false },
  specializations: { vehicleTypes: [], inspectionTypes: [], commercialVehicles: false, electricVehicles: true, luxuryVehicles: false },
  experience: { yearsInBusiness: 0 }, verification: { status: 'verified' },
  stats: { averageRating: null, totalReviews: 0, completedInspections: 0, responseTimeMinutes: null, acceptanceRate: null },
  capabilities: [{ category: 'diagnostics', subcategory: null, status: 'verified', vehicleMakes: 'all', powertrains: [], travelsToCustomer: false, individual: false }, { category: 'hybrid_ev', subcategory: null, status: 'declared', vehicleMakes: 'all', powertrains: ['hybrid'], travelsToCustomer: false, individual: false }],
  packages: [], ...o,
});

const lastParams = () => search.mock.calls[search.mock.calls.length - 1][0] as Record<string, unknown>;

describe('Service finder (inspection marketplace route)', () => {
  beforeEach(() => {
    search.mockReset(); taxonomy.mockReset(); makes.mockReset(); profile.mockReset();
    taxonomy.mockResolvedValue(TAX); makes.mockResolvedValue(['Toyota', 'Subaru']);
    search.mockResolvedValue({ items: [prov()], total: 1 });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('never sends status, verified, sort or rating parameters; those are server decisions', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    const p = lastParams();
    for (const k of ['status', 'verified', 'sortBy', 'minRating']) expect(p).not.toHaveProperty(k);
  });

  it('states plainly that KAYAD is a platform and businesses are independent', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    const note = screen.getAllByRole('note')[0];
    expect(note.textContent).toMatch(/technology platform/i);
    expect(note.textContent).toMatch(/independent/i);
    expect(note.textContent).toMatch(/not a guarantee/i);
  });

  it('shows "No reviews yet" and never 0.0 for an unrated business', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    expect(screen.getByText('No reviews yet')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/0\.0/);
  });

  it('labels verified and declared capabilities differently and does not show the old EV badge as a fact', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    const list = screen.getByRole('list', { name: 'Services' });
    expect(within(list).getByText(/Diagnostics and fault assessment/).closest('li')!.textContent).toMatch(/verified/);
    const hybrid = within(list).getByText(/Hybrid and electric vehicles/).closest('li')!;
    expect(hybrid.textContent).toMatch(/declared/);
    expect(hybrid.textContent).not.toMatch(/verified by KAYAD/);
    expect(hybrid.textContent).toMatch(/not verified/);
    expect(screen.queryByText('EV')).toBeNull();
  });

  it('choosing a category filters through the canonical code and explains whether it is bookable', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    fireEvent.click(await screen.findByRole('button', { name: /Diagnostics and fault assessment/ }));
    await waitFor(() => expect(lastParams().category).toBe('diagnostics'));
    expect(screen.getByText(/does not take bookings or payments for this service yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Pre-purchase inspection/ }));
    await waitFor(() => expect(lastParams().category).toBe('pre_purchase_inspection'));
    expect(screen.getByText(/You can book and pay for this service through KAYAD/)).toBeTruthy();
  });

  it('a symptom only suggests where to look and says it is not a diagnosis', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    await screen.findByRole('option', { name: 'A warning light is on' });
    fireEvent.change(screen.getByLabelText('Not sure what is wrong?'), { target: { value: 'warning_light' } });
    const status = await screen.findByText(/not a diagnosis/i);
    expect(status.textContent).toMatch(/Only a qualified mechanic/);
    fireEvent.click(within(status).getByRole('button', { name: /Diagnostics/ }));
    await waitFor(() => expect(lastParams().category).toBe('diagnostics'));
  });

  it('high-risk categories explain the verified-only rule', async () => {
    render(<InspectionMarketplacePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Hybrid and electric vehicles/ }));
    expect(await screen.findByText(/only businesses whose qualification KAYAD has verified are listed/)).toBeTruthy();
  });

  it('roadside never promises dispatch, tracking, ETA or availability, and points to emergency services', async () => {
    render(<InspectionMarketplacePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Roadside assistance and recovery/ }));
    await waitFor(() => expect(lastParams().atVehicleLocation).toBe(true));
    const note = (await screen.findByText(/does not dispatch, track or guarantee roadside help/)).closest('div')!;
    expect(note.textContent).toMatch(/999 or 112/);
    expect(note.textContent).not.toMatch(/arrives in|ETA of|minutes away/i);
  });

  it('does not ask for the device location until the customer presses the button', async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    fireEvent.click(screen.getByRole('button', { name: /Vehicle, location and other refinements/ }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('sends only an approximate point once permission is granted, and shows distance as straight-line', async () => {
    const getCurrentPosition = vi.fn((ok: (p: unknown) => void) => ok({ coords: { latitude: -1.28634, longitude: 36.81712 } }));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    search.mockResolvedValue({ items: [prov({ distanceKm: 3.2, withinServiceRadius: null })], total: 1 });
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    fireEvent.click(screen.getByRole('button', { name: /Vehicle, location and other refinements/ }));
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    await waitFor(() => expect(lastParams().nearLat).toBe(-1.29));
    expect(lastParams().nearLng).toBe(36.82);
    const dist = await screen.findByText(/About 3.2 km away in a straight line/);
    // coverage is null (unknown): the card must not claim inside OR outside
    expect(dist.textContent).not.toMatch(/service area/);
  });

  it('permission denied falls back to manual county/town and says so', async () => {
    const getCurrentPosition = vi.fn((_ok: unknown, err: (e: { code: number }) => void) => err({ code: 1 }));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    fireEvent.click(screen.getByRole('button', { name: /Vehicle, location and other refinements/ }));
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    expect(await screen.findByText(/Location permission was declined. Enter a county or town instead/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('County'), { target: { value: 'Nairobi' } });
    await waitFor(() => expect(lastParams().county).toBe('Nairobi'));
    expect(lastParams()).not.toHaveProperty('nearLat');
  });

  it('uses the canonical make list and passes the chosen make and power type', async () => {
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    fireEvent.click(screen.getByRole('button', { name: /Vehicle, location and other refinements/ }));
    await waitFor(() => expect(document.querySelectorAll('#f-make-list option').length).toBe(2));
    fireEvent.change(screen.getByLabelText('Vehicle make'), { target: { value: 'Toyota' } });
    fireEvent.change(screen.getByLabelText('Fuel / power'), { target: { value: 'electric' } });
    await waitFor(() => expect(lastParams().make).toBe('Toyota'));
    expect(lastParams().powertrain).toBe('electric');
  });

  it('an empty result is explained, nothing is invented, and a broader search is offered', async () => {
    search.mockResolvedValueOnce({ items: [prov()], total: 1 }).mockResolvedValue({ items: [], total: 0 });
    render(<InspectionMarketplacePage />);
    await screen.findByText('Acme Garage');
    fireEvent.click(screen.getByRole('button', { name: /Diagnostics and fault assessment/ }));
    expect(await screen.findByText(/No matching businesses for Diagnostics and fault assessment/)).toBeTruthy();
    expect(screen.getByText(/does not mean no one can help/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show all services' }));
    await waitFor(() => expect(lastParams().category).toBeUndefined());
  });

  it('a failed search is an error with retry, not an empty list', async () => {
    search.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ items: [prov()], total: 1 });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<InspectionMarketplacePage />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
    expect(screen.queryByText(/No matching businesses/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Acme Garage')).toBeTruthy();
  });

  it('if the taxonomy fails the page still lists businesses and says the categories are unavailable', async () => {
    taxonomy.mockRejectedValue(new Error('x'));
    render(<InspectionMarketplacePage />);
    expect(await screen.findByText('Acme Garage')).toBeTruthy();
    expect((await screen.findAllByRole('alert'))[0].textContent).toMatch(/Service categories could not be loaded/);
  });

  it('a profile for a non-bookable business does not offer a fake booking button', async () => {
    profile.mockResolvedValue(prov({ contact: { email: 'a@x.co', phone: '0700' }, packages: [], credentials: [], team: { confirmedMembers: 2 } }));
    render(<InspectionMarketplacePage />);
    fireEvent.click(await screen.findByRole('button', { name: /View business/ }));
    expect(await screen.findByText(/is an independent business/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue to booking' })).toBeNull();
    expect(screen.getByText(/does not take bookings or payments for this business’s other services yet/)).toBeTruthy();
    expect(screen.getByText(/2 confirmed team members/)).toBeTruthy();
  });
});
