import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PersonalSignOutButton from '../../components/dashboard/personal/PersonalSignOutButton';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}{location.search}</output>;
}

const mount = (onSignOut: () => Promise<{ ok: boolean; message?: string }>) => render(
  <MemoryRouter initialEntries={['/?nav=dashboard&section=my-vehicles']}>
    <PersonalSignOutButton onSignOut={onSignOut} />
    <Routes>
      <Route path="/" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe('PersonalSignOutButton', () => {
  it('confirms and uses the supplied canonical logout flow before redirecting home', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue({ ok: true });
    mount(onSignOut);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to sign out?');
    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('current-location')).toHaveTextContent('/'));
  });

  it('does not redirect when the canonical logout flow cannot confirm sign-out', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue({ ok: false, message: 'Server unavailable' });
    mount(onSignOut);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/?nav=dashboard&section=my-vehicles');
    expect(screen.getByRole('button', { name: /sign out/i })).toBeEnabled();
  });

  it('does nothing when the user cancels confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue({ ok: true });
    mount(onSignOut);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(onSignOut).not.toHaveBeenCalled();
  });
});
