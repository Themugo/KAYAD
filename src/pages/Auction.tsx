import { AuctionsPageRefactored } from '../components/auctions/AuctionsPageRefactored';
import type { Car } from '../components/features/car/CarCard';

interface AuctionProps {
  setPage?: (page: string) => void;
  viewCar?: (car: Car) => void;
}

// Refactored AuctionsPage with correct business model:
// - Auction Organizers conduct auctions
// - Payments go directly to organizers, not KAYAD
// - KAYAD provides marketplace technology
export default function Auction(_props: AuctionProps) {
  return <AuctionsPageRefactored />;
}
