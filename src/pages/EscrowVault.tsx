import { EscrowPage } from '../components/escrow/EscrowPage';

interface EscrowVaultProps {
  setPage?: (page: string) => void;
}

// Same pattern as the other passes: EscrowPage is self-contained via
// useMarketplace(). setPage kept for compatibility with App.tsx's existing
// route wiring but unused.
export default function EscrowVault(_props: EscrowVaultProps) {
  return <EscrowPage />;
}
