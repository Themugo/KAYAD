import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VehicleDetailModal } from '../../components/VehicleDetailModal';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('VehicleDetailModal', () => {
  it('renders without throwing when given a real vehicle from mock data', () => {
    const vehicle = INITIAL_VEHICLES[0];
    render(
      <VehicleDetailModal
        vehicle={vehicle}
        notFoundId={null}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={() => {}}
        onRequestInspection={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
        onSelectVehicle={() => {}}
      />
    );
    expect(screen.getByText(vehicle.title)).toBeTruthy();
  });

  it('renders every vehicle in INITIAL_VEHICLES without throwing', () => {
    for (const vehicle of INITIAL_VEHICLES) {
      const { unmount } = render(
        <VehicleDetailModal
          vehicle={vehicle}
          notFoundId={null}
          allVehicles={INITIAL_VEHICLES}
          onClose={() => {}}
          onStartEscrow={() => {}}
          onContactSeller={() => {}}
          onRequestInspection={() => {}}
          isSaved={false}
          onToggleSave={() => {}}
          onSelectVehicle={() => {}}
        />
      );
      unmount();
    }
  });

  it('renders a "not found" state without throwing when the id has no match', () => {
    render(
      <VehicleDetailModal
        vehicle={null}
        notFoundId="some-id-that-does-not-exist"
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={() => {}}
        onRequestInspection={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
        onSelectVehicle={() => {}}
      />
    );
    expect(screen.getByText(/unavailable/i)).toBeTruthy();
  });

  it('renders nothing when both vehicle and notFoundId are absent (closed state)', () => {
    const { container } = render(
      <VehicleDetailModal
        vehicle={null}
        notFoundId={null}
        allVehicles={INITIAL_VEHICLES}
        onClose={() => {}}
        onStartEscrow={() => {}}
        onContactSeller={() => {}}
        onRequestInspection={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
        onSelectVehicle={() => {}}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
