import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthModal } from '../../components/AuthModal';

const Where = () => {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}{l.search}</div>;
};

const renderAt = (entry: string, isOpen = true) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthModal isOpen={isOpen} />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  );

describe('AuthModal compatibility shim', () => {
  it('forwards to the canonical /login page, keeping the current page as next', () => {
    renderAt('/auctions/7?tab=bids');
    expect(screen.getByTestId('where').textContent).toBe('/login?next=%2Fauctions%2F7%3Ftab%3Dbids');
  });

  it('does nothing while closed and renders no second sign-in form', () => {
    renderAt('/auctions/7', false);
    expect(screen.getByTestId('where').textContent).toBe('/auctions/7');
    expect(screen.queryByPlaceholderText('••••••••')).toBeNull();
  });
});
