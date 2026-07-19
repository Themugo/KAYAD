import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';

interface CompareContextValue {
  compareIds: string[];
  compareCount: number;
  maxCompare: number;
  addCar: (carId: string) => void;
  removeCar: (carId: string) => void;
  toggleCar: (carId: string) => void;
  clearAll: () => void;
  isComparing: (carId: string) => boolean;
}

const CompareCtx = createContext<CompareContextValue | null>(null);

const MAX_COMPARE = 4;
const STORAGE_KEY = 'kayad_compare_ids';

function loadPersisted(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(id => typeof id === 'string');
    }
  } catch (error) {
    console.warn('Unable to load compare list', error);
  }
  return [];
}

interface CompareProviderProps {
  children: ReactNode;
}

export function CompareProvider({ children }: CompareProviderProps) {
  const [compareIds, setCompareIds] = useState<string[]>(loadPersisted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    } catch (error) {
      console.warn('Unable to persist compare list', error);
    }
  }, [compareIds]);

  const addCar = useCallback((carId: string) => {
    setCompareIds(prev => {
      if (prev.includes(carId)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, carId];
    });
  }, []);

  const removeCar = useCallback((carId: string) => {
    setCompareIds(prev => prev.filter(id => id !== carId));
  }, []);

  const toggleCar = useCallback((carId: string) => {
    setCompareIds(prev => {
      if (prev.includes(carId)) return prev.filter(id => id !== carId);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, carId];
    });
  }, []);

  const clearAll = useCallback(() => setCompareIds([]), []);

  const isComparing = useCallback((carId: string) => compareIds.includes(carId), [compareIds]);

  const value = useMemo(() => ({
    compareIds,
    compareCount: compareIds.length,
    maxCompare: MAX_COMPARE,
    addCar, removeCar, toggleCar, clearAll, isComparing,
  }), [compareIds, addCar, removeCar, toggleCar, clearAll, isComparing]);

  return (
    <CompareCtx.Provider value={value}>
      {children}
    </CompareCtx.Provider>
  );
}

export const useCompare = (): CompareContextValue => {
  const ctx = useContext(CompareCtx);
  if (!ctx) {
    throw new Error('useCompare must be used within CompareProvider');
  }
  return ctx;
};
