import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageJourneyNavigation from '../../components/navigation/PageJourneyNavigation';

/** Segments are separate spans with a decorative aria-hidden "/" (spacing is CSS), so assert the ordered segments. */
function expectBreadcrumb(section: string) {
  const crumb = screen.getByLabelText('Breadcrumb');
  const visible = Array.from(crumb.children)
    .filter((el) => el.getAttribute('aria-hidden') !== 'true')
    .map((el) => el.textContent);
  expect(visible).toEqual(['Personal Account', section]);
  expect(crumb.querySelector('[aria-hidden="true"]')).toHaveTextContent('/');
}

describe('PageJourneyNavigation on the unified personal dashboard', () => {
  it('replaces recently visited tabs with a section-aware personal-account breadcrumb', () => {
    render(
      <MemoryRouter initialEntries={['/?nav=dashboard&section=my-vehicles']}>
        <PageJourneyNavigation />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('tablist', { name: 'Recently visited pages' })).not.toBeInTheDocument();
    expectBreadcrumb('My Vehicles');
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
    expectBreadcrumb('My Account');
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/?nav=dashboard&section=overview']}>
        <PageJourneyNavigation />
      </MemoryRouter>,
    );
    expectBreadcrumb('Overview');
  });
});
