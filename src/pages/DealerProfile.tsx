import { DealerProfilePage } from '../components/dealer/DealerProfilePage';
import type { Car } from '../components/features/car/CarCard';

interface DealerProfileProps {
  setPage?: (page: string) => void;
  viewCar?: (car: Car) => void;
}

// Same pattern as previous passes. Known limitation: DealerProfilePage
// always shows the first mock dealer (mockDealers[0]) rather than looking
// one up by an id param — matches the reference repo's own behavior, not
// something introduced here.
export default function DealerProfile(_props: DealerProfileProps) {
  return <DealerProfilePage />;
}
