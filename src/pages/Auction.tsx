import { AuctionsPage } from '../components/auctions/AuctionsPage';
import type { Car } from '../components/features/car/CarCard';

interface AuctionProps {
  setPage?: (page: string) => void;
  viewCar?: (car: Car) => void;
}

// Same pattern as Home.tsx / Gallery.tsx / CarDetail.tsx: AuctionsPage is
// self-contained via useMarketplace() and useAuth(). setPage/viewCar kept
// for compatibility with App.tsx's existing route wiring but unused.
export default function Auction(_props: AuctionProps) {
  return <AuctionsPage />;
}
