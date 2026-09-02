import DealerProfilePage from './DealerProfilePage';

/**
 * Canonical public dealer profile route. Dealer data and inventory are loaded
 * from the backend; no synthetic dealer record is used as a fallback.
 */
export default function DealerProfile() {
  return <DealerProfilePage />;
}
