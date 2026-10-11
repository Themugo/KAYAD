import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import EscrowPage from '../../pages/EscrowPage';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('Legacy EscrowPage route', () => {
  it('redirects to the canonical public escrow information page', async () => {
    render(<MemoryRouter initialEntries={['/escrow']}><EscrowPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId('location')).toHaveTextContent('/?nav=escrow');
  });
});
