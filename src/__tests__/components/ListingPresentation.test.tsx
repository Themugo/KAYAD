import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingStatusBadge, ListingThumb, ListingFacts, ListingScoreRing, listingTone } from '../../components/listing/ListingPresentation';

describe('listing presentation', () => {
  it('maps backend statuses to consistent tones', () => {
    expect(listingTone('available')).toBe('live');
    expect(listingTone('pending')).toBe('review');
    expect(listingTone('sold')).toBe('sold');
    expect(listingTone('rejected')).toBe('problem');
    expect(listingTone(undefined)).toBe('draft');
  });
  it('shows the wording it is given', () => {
    render(<ListingStatusBadge status="available" label="Available" />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
  it('thumb falls back to the full image, then to an icon, and shows the photo count', () => {
    const { container } = render(<ListingThumb src="/thumb.jpg" fallback="/full.jpg" alt="Prado" count={3} />);
    const img = screen.getByAltText('Prado');
    expect(img.getAttribute('src')).toBe('/thumb.jpg');
    fireEvent.error(img);
    expect(screen.getByAltText('Prado').getAttribute('src')).toBe('/full.jpg');
    fireEvent.error(screen.getByAltText('Prado'));
    expect(screen.queryByAltText('Prado')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
  it('facts skip empty values; score ring is labelled', () => {
    render(<><ListingFacts items={['2018', null, false, 'Nairobi']} /><ListingScoreRing score={86} /></>);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /listing quality 86 percent/i })).toBeInTheDocument();
  });
});
