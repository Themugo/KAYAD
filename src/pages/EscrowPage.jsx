import { Navigate } from 'react-router-dom';

/**
 * Legacy-route compatibility only.
 * The canonical public escrow page is mounted by App.tsx at ?nav=escrow.
 * Do not restore the former duplicate page: it contained outdated claims that
 * every purchase was protected and mixed participant records into a public
 * route. Authenticated deal data belongs in buyer/dealer portals.
 */
export default function EscrowPage() {
  return <Navigate to="/?nav=escrow" replace />;
}
