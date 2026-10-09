import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const getMy = vi.fn();
const getBookings = vi.fn();
vi.mock('../../../services/inspectionApi', async (orig) => ({ ...(await orig<object>()), getMyInspections: () => getMy() }));
vi.mock('../../../features/InspectionMarketplace/services/api', () => ({
  inspectionApi: { getCustomerBookings: () => getBookings(), getReport: vi.fn(), registerProvider: vi.fn(), initiatePayment: vi.fn(), getPaymentStatus: vi.fn(), cancelBooking: vi.fn() },
  automotiveApi: { getServiceTaxonomy: vi.fn(), getVehicleMakes: vi.fn(), getMyProvider: vi.fn() },
}));
vi.mock('../../../context/SocketContext', () => ({ useSocket: () => ({ joinInspection: () => undefined, leaveChannel: () => undefined }) }));

import InspectionsView from '../../../features/InspectionsView';
import { NAV_PRIMARY } from '../../../components/navigation/navConfig';
import { VehicleDetailModal } from '../../../components/VehicleDetailModal';
import { INITIAL_VEHICLES } from '../../fixtures/mockVehicles';

const user = { id: 'u1', name: 'Amina' } as never;
const renderHub = (props: Record<string, unknown> = {}) =>
  render(<InspectionsView vehicles={[]} user={user} onOpenAuth={vi.fn()} onOpenInspectionMarketplace={vi.fn()} {...props} />);

describe('Automotive services hub: states one truthful business model', () => {
  beforeEach(() => { getMy.mockReset().mockResolvedValue({ success: true, orders: [] }); getBookings.mockReset().mockResolvedValue({ bookings: [] }); });

  it('presents KAYAD as the platform and independent providers as the performers', () => {
    renderHub();
    const text = document.body.textContent || '';
    expect(text).toMatch(/KAYAD is the platform/);
    expect(text).toMatch(/They carry out the work, not KAYAD/);
    expect(text).toMatch(/does not take repair bookings, take payments for them or dispatch roadside help/);
    expect(text).not.toMatch(/KAYAD vehicle inspection|Request a KAYAD inspection/);
  });

  it('offers both lanes and routes each to the finder with the right canonical category', () => {
    const open = vi.fn();
    renderHub({ onOpenInspectionMarketplace: open });
    fireEvent.click(screen.getByRole('button', { name: /Choose a provider/ }));
    expect(open).toHaveBeenLastCalledWith('pre_purchase_inspection');
    fireEvent.click(screen.getByRole('button', { name: /Roadside and recovery/ }));
    expect(open).toHaveBeenLastCalledWith('roadside_recovery');
    fireEvent.click(screen.getByRole('button', { name: /^Find a provider/ }));
    expect(open).toHaveBeenLastCalledWith();
    fireEvent.click(screen.getByRole('button', { name: /Find a mechanic or garage/ }));
    expect(open).toHaveBeenLastCalledWith();
  });

  it('explains what verified means without promising quality', () => {
    renderHub();
    const text = document.body.textContent || '';
    expect(text).toMatch(/not verified just by registering/);
    expect(text).toMatch(/declared or verified/);
    expect(text).toMatch(/only when both sides have confirmed it/);
    expect(text).toMatch(/Verification is not a guarantee of quality/);
  });

  it('the matched-inspection request shows who carries it out, or that a provider is still being matched', async () => {
    getMy.mockResolvedValue({ success: true, orders: [
      { id: 'o1', status: 'requested', car: { id: 'c1', title: 'Prado' }, createdAt: '2026-10-01T00:00:00Z' },
      { id: 'o2', status: 'assigned', car: { id: 'c2', title: 'Fit' }, inspector: { id: 'i', name: 'Jane', businessName: 'Ace Garage' }, createdAt: '2026-10-02T00:00:00Z' },
    ] });
    getBookings.mockResolvedValue({ bookings: [] });
    renderHub({ initialTab: 'mine' });
    expect(await screen.findByText(/KAYAD is matching a provider/)).toBeTruthy();
    expect(screen.getByText(/carried out by Ace Garage/)).toBeTruthy();
  });
});

describe('Navigation: the services entry covers more than inspection and invents no routes', () => {
  const item = NAV_PRIMARY.find((i) => i.id === 'inspection')!;
  it('is labelled Auto Services with four real destinations', () => {
    expect(item.label).toBe('Auto Services');
    expect(item.children!.map((c) => c.id)).toEqual(['request', 'providers', 'roadside', 'mine']);
    expect(item.children!.map((c) => c.navId)).toEqual(['services:inspect', 'services:find', 'services:roadside', 'services:mine']);
  });
  it('the signed-in-only entry is flagged and the roadside entry does not promise dispatch', () => {
    expect(item.children!.find((c) => c.id === 'mine')!.requiresAuth).toBe(true);
    expect(item.children!.find((c) => c.id === 'roadside')!.description).toMatch(/does not dispatch/);
  });
});

describe('Vehicle details no longer render an invented inspection certificate', () => {
  const base = INITIAL_VEHICLES[0];
  const renderModal = (vehicle: typeof base, onRequestInspection = vi.fn()) => {
    render(<VehicleDetailModal vehicle={vehicle} notFoundId={null} allVehicles={INITIAL_VEHICLES} onClose={() => {}} onStartEscrow={() => {}} onContactSeller={() => {}} onRequestInspection={onRequestInspection} isSaved={false} onToggleSave={() => {}} onSelectVehicle={() => {}} />);
    return onRequestInspection;
  };
  it('a vehicle without an inspection record shows no certificate, scores or "passed" claims', () => {
    renderModal({ ...base, inspectionPassed: false, inspection: undefined } as typeof base);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/150-Point Technical Inspection Certificate|PASSED & CERTIFIED|100% Compression Pass|Accident-Free Structure|Zero Bank Encumbrances/);
    expect(text).toMatch(/No inspection report is attached to this listing/);
  });
  it('a vehicle with the flag says so but still points the buyer to their own inspection', () => {
    renderModal({ ...base, inspectionPassed: true } as typeof base);
    expect(document.body.textContent).toMatch(/marked as having passed an inspection/);
    expect(document.body.textContent).toMatch(/arrange your own inspection/);
  });
  it('the panel action starts the inspection with this vehicle', () => {
    const fn = renderModal({ ...base, inspectionPassed: false } as typeof base);
    fireEvent.click(screen.getByRole('button', { name: /Arrange an inspection of this vehicle/ }));
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ id: base.id }));
  });
});

describe('No fixed "150-point" standard or dispatch promise on inspection surfaces', () => {
  const files = [
    'components/VehicleDetailModal.tsx', 'features/DealersView/components/DealerProfileModal.tsx', 'components/Navbar.tsx',
    'components/home/FeaturedVehicles.tsx', 'components/home/Hero.tsx', 'components/home/TrustMetricsBar.tsx', 'components/TrustBadgeMatrix.tsx',
    'components/CompareModal.tsx', 'features/VehicleMarketplace/hooks/useHomePageConfig.ts', 'components/sell/SellPage.tsx',
    'components/dashboard/DashboardPage.tsx', 'pages/Support.tsx', 'features/UnifiedCommunicationHub.tsx', 'features/InspectionsView.tsx',
  ];
  it.each(files)('%s', (f) => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src', f), 'utf8');
    const visible = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('{/*')).join('\n');
    expect(visible).not.toMatch(/150-?[Pp]oint|150-Pt/);
    expect(visible).not.toMatch(/[Dd]ispatch (a )?certified mechanic|Inspection Guaranteed/);
  });
});
