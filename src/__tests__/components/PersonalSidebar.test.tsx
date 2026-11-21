import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalSidebar from '../../components/dashboard/personal/PersonalSidebar';

describe('PersonalSidebar', () => {
  it('keeps account navigation independently scrollable and sign-out anchored after it', () => {
    const { container } = render(
      <MemoryRouter>
        <PersonalSidebar name="James" active="my-vehicles" onSelect={vi.fn()} onSignOut={vi.fn().mockResolvedValue({ ok: true })} />
      </MemoryRouter>,
    );

    const sidebar = container.querySelector('[data-kayad-personal-sidebar="true"]');
    const navigation = screen.getByRole('navigation', { name: 'Personal dashboard sections' });
    const signOut = screen.getByTestId('personal-sign-out');
    expect(sidebar).toContainElement(navigation);
    expect(sidebar).toContainElement(signOut);
    expect(navigation.className).toContain('overflow-y-auto');
    expect(signOut.parentElement?.className).toContain('shrink-0');
    expect(screen.getByText('James')).toBeInTheDocument();
  });
});
