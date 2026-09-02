import CarDetailPage from './CarDetailPage';

/**
 * Canonical vehicle detail route. The page loads the requested vehicle directly
 * from the backend and fails closed when the vehicle cannot be found.
 */
export default function CarDetail() {
  return <CarDetailPage />;
}
