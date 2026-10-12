import { Navigate } from 'react-router-dom';

/**
 * Compatibility entry for older imports. KAYAD has one canonical seller
 * workspace at `/?nav=seller-platform`; keep every Sell Cars entry point on
 * that real onboarding flow rather than maintaining a second form that only
 * simulated success locally and never created an account or listing.
 */
export const SellPage = () => <Navigate to="/?nav=seller-platform" replace />;

export default SellPage;
