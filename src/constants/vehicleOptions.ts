// Kenyan market vocabulary for vehicle listings, shared by every form and filter so a value a dealer saves is a value a buyer can filter by.
// Mirrors backend/utils/vehicleOptions.js (the server also accepts the older "Gasoline" and stores it as "Petrol").
export const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric'] as const;
export const CONDITIONS = ['Ex-Japan', 'Locally Used', 'New Import', 'Locally Assembled'] as const;

/** "Gasoline" (the previous stored word) and "petrol" are the same fuel. */
export const sameFuel = (a?: string | null, b?: string | null): boolean => {
  const norm = (v?: string | null) => {
    const t = (v || '').trim().toLowerCase();
    return t === 'gasoline' || t === 'gas' ? 'petrol' : t;
  };
  return norm(a) === norm(b);
};
