// PHASE 13I — pure saved-search matcher, moved out of savedSearchCron.js (which re-exports it, so existing imports keep working).
// No I/O. Candidate listings must already be filtered for public eligibility by the caller (see savedSearchNotificationJob.js).
export const matches = (car, filters) => {
  if (!filters || typeof filters !== "object") return true;
  const f = filters;
  const keyword = String(f.keyword ?? f.search ?? "").trim().toLowerCase();
  const brand = String(f.brand ?? "").trim().toLowerCase();
  const model = String(f.model ?? "").trim().toLowerCase();
  const location = String(f.location ?? f.city ?? "").trim().toLowerCase();
  const body = String(f.body ?? f.bodyType ?? "").trim().toLowerCase();
  const fuel = String(f.fuel ?? "").trim().toLowerCase();
  const transmission = String(f.transmission ?? "").trim().toLowerCase();
  const color = String(f.color ?? "").trim().toLowerCase();
  const haystack = `${car.title || ""} ${car.brand || ""} ${car.model || ""}`.toLowerCase();

  if (keyword && !haystack.includes(keyword)) return false;
  if (brand && car.brand?.toLowerCase() !== brand) return false;
  if (model && car.model?.toLowerCase() !== model) return false;
  // Phase 13H: cars.location does not exist (real column location_city, alias `city`); selecting `location` made every cron tick fail.
  if (location && String(car.city ?? car.location?.city ?? "").toLowerCase() !== location) return false;
  if (body && car.bodyType?.toLowerCase() !== body) return false;
  if (fuel && car.fuel?.toLowerCase() !== fuel) return false;
  if (transmission && car.transmission?.toLowerCase() !== transmission) return false;
  if (color && car.color?.toLowerCase() !== color) return false;

  const priceMin = f.priceMin ?? f.minPrice;
  const priceMax = f.priceMax ?? f.maxPrice;
  const yearMin = f.yearMin ?? f.minYear;
  const yearMax = f.yearMax ?? f.maxYear;
  const mileageMin = f.mileageMin ?? f.minMileage;
  const mileageMax = f.mileageMax ?? f.maxMileage;

  if (priceMin !== undefined && priceMin !== "" && (car.price || 0) < Number(priceMin)) return false;
  if (priceMax !== undefined && priceMax !== "" && (car.price || 0) > Number(priceMax)) return false;
  if (yearMin !== undefined && yearMin !== "" && (car.year || 0) < Number(yearMin)) return false;
  if (yearMax !== undefined && yearMax !== "" && (car.year || 0) > Number(yearMax)) return false;
  if (mileageMin !== undefined && mileageMin !== "" && (car.mileage || 0) < Number(mileageMin)) return false;
  if (mileageMax !== undefined && mileageMax !== "" && (car.mileage || 0) > Number(mileageMax)) return false;

  if (f.filter === "auction" || f.auctionOnly === true) {
    if (car.auctionStatus !== "live" && !car.allowBid) return false;
  }
  if (f.filter === "fixed") {
    if (car.allowBid || car.auctionStatus === "live") return false;
  }
  if (f.verifiedOnly === true && car.isVerifiedDealer !== true) return false;

  return true;
};
