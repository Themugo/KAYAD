import React, { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import { getEscrowProgram } from '../services/escrowApi';
import { PublicEscrowExplainer, HowDealsStart, type ProgramState } from './escrow/PublicEscrowExplainer';

interface EscrowViewProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onNavigate?: (nav: string) => void;
}

/**
 * Canonical public escrow information page.
 * Never fetch or render participant escrow records or staff operations here.
 * Those belong in authenticated user/staff portals, with backend authorization
 * remaining the actual security boundary.
 */
export const EscrowView: React.FC<EscrowViewProps> = ({ user, onOpenAuth, onNavigate }) => {
  const [program, setProgram] = useState<ProgramState>({ status: 'loading' });

  const loadProgram = useCallback(async () => {
    setProgram({ status: 'loading' });
    try {
      setProgram({ status: 'ready', program: await getEscrowProgram() });
    } catch {
      setProgram({ status: 'unavailable' });
    }
  }, []);

  useEffect(() => { void loadProgram(); }, [loadProgram]);

  const openCorrectDashboard = useCallback(() => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    const role = String(user.role || '').toLowerCase();
    const destination = ['admin', 'superadmin', 'escrow_officer', 'accounts'].includes(role)
      ? 'escrow-operations'
      : role === 'dealer'
        ? 'dealer-dashboard'
        : 'buyer-platform';
    onNavigate?.(destination);
  }, [user, onOpenAuth, onNavigate]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#0A3340]">Escrow</h1>
        <p className="mt-1 text-sm text-[#64748B]">Understand when KAYAD escrow applies, how the transaction is handled, and where to follow your own deal.</p>
      </header>

      <PublicEscrowExplainer
        program={program}
        signedIn={Boolean(user)}
        onRetryProgram={() => void loadProgram()}
        onOpenAuth={onOpenAuth}
        onOpenDashboard={openCorrectDashboard}
        onNavigate={onNavigate}
      />

      <HowDealsStart
        signedIn={Boolean(user)}
        onOpenDashboard={openCorrectDashboard}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
};

export default EscrowView;
