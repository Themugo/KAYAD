import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import DealerOverview from '../../../pages/dealer/dashboard/overview/DealerOverview';

const base: any = { loading: false, days: 30, verification: 'approved', onOpen: vi.fn(), onAdd: vi.fn(), onEdit: vi.fn(), listings: [], listingsState: 'ready', onRetryListings: vi.fn(), leads: [], leadsState: 'ready', onRetryLeads: vi.fn(), onTab: vi.fn() };
const data: any = {
  access: { owner: true, inventory: true, leads: true, revenue: true, team: true, auctions: true, finance: true },
  listings: { total: 10, active: 6, pendingApproval: 2, sold: 2, draft: 0, hidden: 0, reserved: 0 },
  leads: { totalLeads: 5, newEnquiries: 2 }, pipeline: { new: 2, contacted: 1, negotiating: 0, inspectionBooked: 0, reserved: 0 },
  auctions: { live: [], active: 0 }, financial: { pendingPayout: { amount: 0 } },
  period: { days: 30, sales: { count: 2, revenue: 3000000, previousCount: 1, previousRevenue: 1000000, trend: [{ start: '2026-10-25', end: '2026-11-01', sold: 1, revenue: 1000000 }], recent: [] }, payouts: { amount: 2500000, previousAmount: 0, count: 1 }, inventory: { added: 3 } },
  attention: [{ id: 'new-enquiries', label: 'New enquiries', count: 2, severity: 'warning', target: { section: 'leads' } }],
  health: { published: 6, inventoryQuality: { percent: 83, of: 6 }, listingPerformance: { percent: 50, of: 6 }, leadResponse: { percent: null, unavailableReason: 'Lead response times are not recorded yet.' } },
};
afterEach(cleanup);

describe('DealerOverview', () => {
  it('renders the hero, KPIs, donut legend, trend, attention and health from real data only', () => {
    render(<DealerOverview {...base} data={data} />);
    expect(screen.getByText('Run your dealership from one place')).toBeTruthy();
    expect(screen.getByTestId('kpi-inventory-value').textContent).toBe('10');
    expect(screen.getByTestId('kpi-leads-value').textContent).toBe('3');
    expect(screen.getByTestId('kpi-sales-value').textContent).toBe('2');
    expect(screen.getByTestId('kpi-payouts-value').textContent).toContain('2,500,000');
    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByTestId('attention-new-enquiries')).toBeTruthy();
    expect(within(screen.getByTestId('health-lead-response')).getByText('—')).toBeTruthy();
    expect(within(screen.getByTestId('health-inventory-quality')).getByText('83%')).toBeTruthy();
  });
  it('hides what the role cannot see instead of showing fake values', () => {
    const agent = { ...data, access: { ...data.access, finance: false, leads: false }, leads: undefined, auctions: undefined, financial: undefined, period: { ...data.period, payouts: undefined } };
    render(<DealerOverview {...base} data={agent} />);
    expect(screen.queryByTestId('kpi-leads')).toBeNull();
    expect(screen.queryByTestId('kpi-payouts')).toBeNull();
    expect(screen.queryByRole('button', { name: 'View Leads' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Payouts' })).toBeNull();
  });
  it('shows empty states, not zeros dressed up as charts', () => {
    const empty = { ...data, listings: { total: 0, active: 0, pendingApproval: 0, sold: 0, draft: 0, hidden: 0, reserved: 0 }, period: { ...data.period, sales: { count: 0, revenue: 0, previousCount: 0, previousRevenue: 0, trend: [], recent: [] } }, attention: [] };
    render(<DealerOverview {...base} data={empty} />);
    expect(screen.getByTestId('inventory-empty')).toBeTruthy();
    expect(screen.getByTestId('sales-empty')).toBeTruthy();
    expect(screen.getByTestId('attention-empty')).toBeTruthy();
  });
  it('hero and attention actions call the real navigation handlers', () => {
    const onOpen = vi.fn(); const onAdd = vi.fn();
    render(<DealerOverview {...base} data={data} onOpen={onOpen} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a vehicle' })); expect(onAdd).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Auctions' })); expect(onOpen).toHaveBeenCalledWith('auctions');
    fireEvent.click(screen.getByTestId('attention-new-enquiries')); expect(onOpen).toHaveBeenCalledWith('leads');
  });
  it('loading shows skeletons with status roles', () => {
    render(<DealerOverview {...base} data={null} loading />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(2);
  });
});
