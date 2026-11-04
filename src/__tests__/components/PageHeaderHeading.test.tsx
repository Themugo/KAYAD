import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../../components/ui';

describe('PageHeader', () => {
  it.each(['white', 'navy'] as const)('renders the page title as the main heading (%s variant)', (variant) => {
    render(<PageHeader badgeText="Badge" title="Explore Showrooms" description="d" variant={variant} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Explore Showrooms' })).toBeTruthy();
  });
});
