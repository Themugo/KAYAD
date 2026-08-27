import { Hero } from '../components/home/Hero';
import { FeaturedVehicles } from '../components/home/FeaturedVehicles';
import { LiveAuctionsSection } from '../components/home/LiveAuctionsSection';
import { EscrowTrustBanner } from '../components/home/EscrowTrustBanner';
import { SellCarBanner } from '../components/home/SellCarBanner';
import type { Car } from '../components/features/car/CarCard';

interface HomeProps {
  setPage?: (page: string) => void;
  viewCar?: (car: Car) => void;
}

// Structure matches Kayad-Marketplace-3's homepage composition. All five
// sections are self-contained — they pull data and navigation from
// MarketplaceContext (useMarketplace()) rather than props, so this file
// stays a thin composer. setPage/viewCar are accepted for compatibility
// with how App.tsx currently wires this route, but are no longer used:
// navigation goes through MarketplaceContext's navigateTo, which now
// drives real react-router navigation.
export default function Home(_props: HomeProps) {
  return (
    <div>
      <Hero />
      <FeaturedVehicles />
      <LiveAuctionsSection />
      <EscrowTrustBanner />
      <SellCarBanner />
    </div>
  );
}
