import { useState, useCallback, useMemo } from 'react';
import { Vehicle } from '../types';

/**
 * Phase 1 architecture hardening: extracted from App.tsx, which
 * previously held savedVehicles/comparedVehicles state and their
 * derived lists/toggle handlers directly alongside 15+ other pieces of
 * unrelated state (auth modals, chat, escrow, search/filter, etc.).
 * This is a self-contained, low-risk extraction candidate specifically
 * because these two pieces of state are conceptually related (both
 * "the user's relationship to a set of vehicle IDs"), have no
 * dependency on any other App.tsx state besides the vehicles list
 * itself (passed in, not owned here), and their toggle logic was
 * already fully self-contained before this extraction - moved
 * verbatim, not rewritten, to keep this a structural change only, per
 * this phase's own "do not add features" instruction.
 *
 * App.tsx's own vehicles state remains where it is - this hook takes
 * the current vehicle list as a parameter rather than owning it,
 * since vehicles is used by many other parts of App.tsx unrelated to
 * saving/comparing and moving it would be a much larger, riskier
 * change than this phase's scope calls for.
 */
export function useVehicleCollections(vehicles: Vehicle[]) {
  const [savedVehicles, setSavedVehicles] = useState<string[]>(['v1', 'v2']);
  const [comparedVehicles, setComparedVehicles] = useState<string[]>([]);

  // Toggle Save - moved verbatim from App.tsx
  const handleToggleSave = useCallback((id: string) => {
    setSavedVehicles((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // Toggle Compare - moved verbatim from App.tsx, including the
  // existing max-4 limit
  const handleToggleCompare = useCallback((id: string) => {
    setComparedVehicles((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  }, []);

  const savedVehiclesList = useMemo(() => {
    return vehicles.filter((v) => savedVehicles.includes(v.id));
  }, [vehicles, savedVehicles]);

  const comparedVehiclesList = useMemo(() => {
    return vehicles.filter((v) => comparedVehicles.includes(v.id));
  }, [vehicles, comparedVehicles]);

  return {
    savedVehicles,
    comparedVehicles,
    savedVehiclesList,
    comparedVehiclesList,
    handleToggleSave,
    handleToggleCompare,
  };
}
