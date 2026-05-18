import { createContext, useContext, useState, useCallback } from 'react';

const CompareCtx = createContext(null);

const MAX_COMPARE = 4;

export function CompareProvider({ children }) {
  const [compareIds, setCompareIds] = useState([]);

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

  return (
    <CompareCtx.Provider value={{
      compareIds,
      compareCount: compareIds.length,
      maxCompare: MAX_COMPARE,
      addCar, removeCar, toggleCar, clearAll, isComparing,
    }}>
      {children}
    </CompareCtx.Provider>
  );
}

export const useCompare = () => useContext(CompareCtx);
