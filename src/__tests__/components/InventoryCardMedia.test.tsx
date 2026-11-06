import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import InventoryCardMedia from '../../features/VehicleMarketplace/components/InventoryCardMedia';

const imgs = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg'];
const setup = (images?: string[], onOpen = vi.fn()) =>
  render(<InventoryCardMedia title="2016 Toyota Land Cruiser" images={images} className="h-40" onOpen={onOpen} top={<span>badge</span>} />);

describe('InventoryCardMedia', () => {
  it('shows the first photo, a 1/N counter, four thumbnails and a "+N More" tile', () => {
    setup(imgs);
    expect(screen.getByAltText('2016 Toyota Land Cruiser').getAttribute('src')).toBe('/a.jpg');
    expect(screen.getByTestId('card-photo-counter').textContent).toContain('1/6');
    const thumbs = within(screen.getByTestId('card-thumbnails')).getAllByRole('button');
    expect(thumbs).toHaveLength(4);
    expect(thumbs[3].textContent).toContain('+2');
    expect(thumbs[3].textContent).toContain('More');
  });

  it('selecting a thumbnail swaps the main photo and the counter', () => {
    setup(imgs);
    fireEvent.click(screen.getByRole('button', { name: 'Show photo 3 of 6' }));
    expect(screen.getByAltText('2016 Toyota Land Cruiser').getAttribute('src')).toBe('/c.jpg');
    expect(screen.getByTestId('card-photo-counter').textContent).toContain('3/6');
  });

  it('"+N More" and the expand control open the vehicle', () => {
    const onOpen = vi.fn();
    setup(imgs, onOpen);
    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more photos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open 2016 Toyota Land Cruiser' }));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('a single photo has no thumbnail strip, and no photo shows an honest placeholder', () => {
    const { unmount } = setup(['/a.jpg']);
    expect(screen.queryByTestId('card-thumbnails')).toBeNull();
    unmount();
    setup([]);
    expect(screen.getByText('Photo not available')).toBeTruthy();
    expect(screen.queryByTestId('card-photo-counter')).toBeNull();
  });
});
