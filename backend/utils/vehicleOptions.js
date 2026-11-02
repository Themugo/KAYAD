// Kenyan market vocabulary for vehicle listings. Stored values are the display words, exactly as dealers and buyers say them.
export const FUEL_TYPES = Object.freeze(["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"]);
export const CONDITIONS = Object.freeze(["Ex-Japan", "Locally Used", "New Import", "Locally Assembled"]);

/** "Gasoline" (the old stored/filter word) and any casing of "petrol" are the same fuel: Petrol. Anything else is left as sent. */
export function normalizeFuel(value) {
  if (typeof value !== "string") return value;
  const v = value.trim();
  return /^(gasoline|gas|petrol)$/i.test(v) ? "Petrol" : v;
}

/** True when a stored/filter fuel value means petrol (so existing "Gasoline" listings still match a "Petrol" search and vice versa). */
export const isPetrolFuel = (value) => typeof value === "string" && /^(gasoline|gas|petrol)$/i.test(value.trim());

/**
 * "1,500,000", "1 500 000" and "1500000" are the same number. Applied before numeric validation so people can type figures the way they
 * read them. Anything that is still not a number afterwards is rejected by the normal validation (nothing is guessed).
 */
export function stripNumberFormatting(value) {
  return typeof value === "string" ? value.replace(/[,\s]/g, "") : value;
}
