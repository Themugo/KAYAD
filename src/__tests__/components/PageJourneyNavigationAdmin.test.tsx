import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PageJourneyNavigation from '../../components/navigation/PageJourneyNavigation';

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const renderAt = (entry: string, props: object = { dashboardHref: '/admin', fallbackHref: '/admin' }) =>
  render(<MemoryRouter initialEntries={[entry]}><PageJourneyNavigation {...props} /><Routes><Route path="*" element={<Where />} /></Routes></MemoryRouter>);

describe('Admin page navigation (Back / Forward / Dashboard)', () => {
  it('offers Back, Forward and Dashboard on the dashboard itself and on a deep page', () => {
    for (const path of ['/admin', '/admin/staff-permissions']) {
      const { unmount } = renderAt(path);
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go forward to next page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to Admin Dashboard' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Go to KAYARD KE home' })).toBeNull();
      unmount();
    }
  });
  it('Back is disabled on the dashboard with no admin history, enabled elsewhere and falls back to the Dashboard', () => {
    const dash = renderAt('/admin');
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
    dash.unmount();
    renderAt('/admin/users');
    const back = screen.getByRole('button', { name: 'Go to previous page' });
    expect(back).not.toBeDisabled();
    fireEvent.click(back);
    expect(screen.getByTestId('where')).toHaveTextContent('/admin');
  });
  it('the Dashboard shortcut always returns to /admin', () => {
    renderAt('/admin/escrows');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Admin Dashboard' }));
    expect(screen.getByTestId('where').textContent).toBe('/admin');
  });
  it('a staff member in My Account gets a visible way back to the Admin Console', () => {
    renderAt('/?nav=dashboard&section=account', { adminHref: '/admin' });
    fireEvent.click(screen.getByRole('button', { name: /Admin Console/ }));
    expect(screen.getByTestId('where').textContent).toBe('/admin');
  });
  it('a non-staff My Account does not show an Admin link', () => {
    renderAt('/?nav=dashboard&section=account', {});
    expect(screen.queryByRole('button', { name: /Admin Console/ })).toBeNull();
  });
});
