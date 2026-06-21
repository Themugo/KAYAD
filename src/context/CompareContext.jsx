import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

const CompareCtx = createContext(null);

const MAX_COMPARE = 4;
const STORAGE_KEY = 'kayad_compare_ids';

function loadPersisted() {
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

export function CompareProvider({ children }) {
  const [compareIds, setCompareIds] = useState(loadPersisted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    } catch (error) {
      console.warn('Unable to persist compare list', error);
    }
  }, [compareIds]);

  const addCar = useCallback((carId) => {
    setCompareIds(prev => {
      if (prev.includes(carId)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, carId];
    });
  }, []);

  const removeCar = useCallback((carId) => {
    setCompareIds(prev => prev.filter(id => id !== carId));
  }, []);

  const toggleCar = useCallback((carId) => {
    setCompareIds(prev => {
      if (prev.includes(carId)) return prev.filter(id => id !== carId);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, carId];
    });
  }, []);

  const clearAll = useCallback(() => setCompareIds([]), []);

  const isComparing = useCallback((carId) => compareIds.includes(carId), [compareIds]);

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

export const useCompare = () => {
  const ctx = useContext(CompareCtx);
  if (!ctx) {
    throw new Error('useCompare must be used within CompareProvider');
  }
  return ctx;
};
