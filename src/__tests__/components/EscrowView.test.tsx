import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView';
import { MOCK_ESCROW_DEALS, INITIAL_VEHICLES } from '../../data/mockVehicles';

// Phase 4 note (core workflow consolidation): this file previously
// tested a `prefillVehicle` prop and its "switches to the create tab
// and pre-fills real vehicle data" behavior. Confirmed directly: the
// canonical, actually-shipping EscrowView (features/EscrowView.tsx)
// has no prefillVehicle prop and never did - that capability only
// ever existed in the non-canonical, duplicate implementation
// (features/EscrowView/components/EscrowView.tsx, removed this phase
// after confirming via a built-bundle content check that it was never
// the version that shipped). App.tsx was also confirmed to never pass
// any such prop today. Porting this capability into the canonical
// component is real feature work, outside this phase's explicit "no
// feature additions" scope - removed rather than left failing against
// behavior that was never live, and named directly in
// LEGACY_REMOVAL_REPORT.md as identified-but-not-ported missing
// behavior for a future, dedicated pass. The one test below covering
// genuinely real, current behavior (the default view with no prefill
// concept involved) is kept.
describe('EscrowView - default view (real, current behavior)', () => {
  it('renders the default deals view without crashing', () => {
    render(<EscrowView deals={MOCK_ESCROW_DEALS} />);
    expect(screen.queryByDisplayValue(INITIAL_VEHICLES[0].title)).toBeNull();
  });
});
