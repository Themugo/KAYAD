import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { VehicleDetailPage } from '../components/detail/VehicleDetailPage';
import { useMarketplace } from '../context/MarketplaceContext';
import type { Car } from '../components/features/car/CarCard';

interface CarDetailProps {
  car?: Car;
  setPage?: (page: string) => void;
  viewCar?: (car: Car) => void;
}

// Same pattern as Home.tsx / Gallery.tsx: VehicleDetailPage is self-contained
// via useMarketplace() (selectedVehicle, bidding, escrow, chat, save/alerts
// all come from MarketplaceContext). car/setPage/viewCar kept for
// compatibility with App.tsx's existing route wiring but are no longer used.
//
// Known limitation: MarketplaceContext's mock vehicles use ids like 'veh_1',
// while this app's real Car data (src/data/cars.ts) uses plain numeric ids.
// Clicking through from the gallery or homepage works correctly end-to-end
// (navigateTo sets the selected id before navigating), but a direct URL
// visit to /car/<real-numeric-id> won't match a mock vehicle and falls back
// to the first mock vehicle rather than 404ing. Resolving this properly
// means deciding whether vehicle detail pulls from real or mock data —
// deferred, same as the gallery pass.
export default function CarDetail(_props: CarDetailProps) {
  const { id } = useParams();
  const { selectedVehicleId, navigateTo } = useMarketplace();
  const synced = useRef(false);

  useEffect(() => {
    if (id && id !== selectedVehicleId && !synced.current) {
      synced.current = true;
      navigateTo('vehicle_detail', id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return <VehicleDetailPage />;
}
