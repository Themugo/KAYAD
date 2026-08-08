import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VehicleCard } from '../../components/VehicleCard';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('VehicleCard - size reduction (scale/density pass)', () => {
  const vehicle = INITIAL_VEHICLES[0];
  const baseProps = {
    vehicle,
    isSaved: false,
    isCompared: false,
    onToggleSave: vi.fn(),
    onToggleCompare: vi.fn(),
    onQuickView: vi.fn(),
    onStartEscrow: vi.fn(),
  };

  it('renders the image container at the reduced height, not the old h-48/h-52', () => {
    const { container: c } = render(<VehicleCard {...baseProps} />);
    const imageWrapper = c.querySelector('.relative.overflow-hidden.bg-slate-100');
    expect(imageWrapper).toBeTruthy();
    expect(imageWrapper?.className).toMatch(/h-32/);
    expect(imageWrapper?.className).not.toMatch(/h-48/);
    expect(imageWrapper?.className).not.toMatch(/h-52/);
  });

  it('still shows every real vehicle spec after the redesign - transmission was removed by mistake in an early pass and restored', () => {
    render(<VehicleCard {...baseProps} />);
    // Title, price, transmission, and seller are all real fields from
    // the actual mock vehicle - if any got dropped while shrinking the
    // card, this catches it directly rather than relying on visual review.
    expect(screen.getByText(vehicle.title)).toBeTruthy();
    expect(screen.getByText(new RegExp(vehicle.transmission || 'Automatic'))).toBeTruthy();
    expect(screen.getByText(new RegExp(vehicle.fuelType))).toBeTruthy();
  });

  it('the whole card and the compact "Details" affordance both trigger onQuickView (no functionality lost when the full-width button was removed)', () => {
    const onQuickView = vi.fn();
    render(<VehicleCard {...baseProps} onQuickView={onQuickView} />);
    screen.getByText(vehicle.title).click();
    expect(onQuickView).toHaveBeenCalledWith(vehicle);
  });
});
