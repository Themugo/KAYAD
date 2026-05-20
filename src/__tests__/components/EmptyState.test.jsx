import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EmptyState } from '../../components/EmptyState';
import { MemoryRouter } from 'react-router-dom';

describe('EmptyState', () => {
  afterEach(() => { cleanup(); });

  it('renders default props', () => {
    render(<MemoryRouter><EmptyState /></MemoryRouter>);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(<MemoryRouter><EmptyState title="No cars" message="No cars match your search." /></MemoryRouter>);
    expect(screen.getByText('No cars')).toBeInTheDocument();
    expect(screen.getByText('No cars match your search.')).toBeInTheDocument();
  });

  it('renders link when actionTo provided', () => {
    render(<MemoryRouter><EmptyState actionLabel="Browse Cars" actionTo="/showroom" /></MemoryRouter>);
    const link = screen.getByText('Browse Cars');
    expect(link.closest('a')).toHaveAttribute('href', '/showroom');
  });

  it('renders button when onAction provided', () => {
    const onClick = vi.fn();
    render(<MemoryRouter><EmptyState actionLabel="Retry" onAction={onClick} /></MemoryRouter>);
    screen.getByText('Retry').click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
