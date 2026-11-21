import { GalleryPage } from '../components/gallery/GalleryPage';
import type { Car } from '../components/features/car/CarCard';

interface GalleryProps {
  setPage?: (page: string) => void;
  viewCar?: (car: Car) => void;
}

// Same pattern as Home.tsx: GalleryPage is self-contained via
// useMarketplace() (filters, sort, search, navigation all come from
// MarketplaceContext). setPage/viewCar kept for compatibility with
// App.tsx's existing route wiring but are no longer used.
export default function Gallery(_props: GalleryProps) {
  return <GalleryPage />;
}
