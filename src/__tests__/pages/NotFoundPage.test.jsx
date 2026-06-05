import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../../pages/NotFoundPage';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));

describe('NotFoundPage', () => {
  afterEach(() => { cleanup(); });

  it('renders 404 heading', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders message and home link', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText(/page you're looking for/i)).toBeInTheDocument();
    const link = screen.getByText(/go home/i);
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });
});
