import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageJourneyNavigation from '../../components/navigation/PageJourneyNavigation';

describe('PageJourneyNavigation on the unified personal dashboard', () => {
  it('replaces recently visited tabs with a section-aware personal-account breadcrumb', () => {
    render(
      <MemoryRouter initialEntries={['/?nav=dashboard&section=my-vehicles']}>
        <PageJourneyNavigation />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('tablist', { name: 'Recently visited pages' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Personal Account / My Vehicles');
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go forward to next page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to KAYARD KE home' })).toBeInTheDocument();
  });

  it('uses the correct breadcrumb for account and overview sections', () => {
    const first = render(
      <MemoryRouter initialEntries={['/?nav=dashboard&section=account']}>
        <PageJourneyNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Personal Account / My Account');
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/?nav=dashboard&section=overview']}>
        <PageJourneyNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Personal Account / Overview');
  });
});
