import Car from "../models/Car.js";
import SavedSearch from "../models/SavedSearch.js";
import { createNotification } from "../controllers/notificationController.js";

const CHECK_INTERVAL = 10 * 60 * 1000;

const matches = (car, filters) => {
  if (!filters || typeof filters !== "object") return true;
  const f = filters;

  if (f.brand && car.brand?.toLowerCase() !== f.brand.toLowerCase()) return false;
  if (f.location && car.location?.city?.toLowerCase() !== f.location.toLowerCase()) return false;
  if (f.body && car.bodyType?.toLowerCase() !== f.body.toLowerCase()) return false;
  if (f.fuel && car.fuel?.toLowerCase() !== f.fuel.toLowerCase()) return false;
  if (f.transmission && car.transmission?.toLowerCase() !== f.transmission.toLowerCase()) return false;
  if (f.color && car.color?.toLowerCase() !== f.color.toLowerCase()) return false;

  if (f.priceMin && (car.price || 0) < Number(f.priceMin)) return false;
  if (f.priceMax && (car.price || 0) > Number(f.priceMax)) return false;
  if (f.yearMin && (car.year || 0) < Number(f.yearMin)) return false;
  if (f.yearMax && (car.year || 0) > Number(f.yearMax)) return false;
  if (f.mileageMin && (car.mileage || 0) < Number(f.mileageMin)) return false;
  if (f.mileageMax && (car.mileage || 0) > Number(f.mileageMax)) return false;

  if (f.filter === "auction" && car.auctionStatus !== "live" && !car.allowBid) return false;
  if (f.filter === "fixed" && (car.allowBid || car.auctionStatus === "live")) return false;

  return true;
};

export const startSavedSearchCron = () => {
  const tick = async () => {
    try {
      const searches = await SavedSearch.find({ notify: true }).lean();
      if (searches.length === 0) return;

      const since = new Date(Date.now() - CHECK_INTERVAL);
      const newCars = await Car.find({ createdAt: { $gte: since } })
        .select("title brand price year mileage fuel transmission bodyType color location.city auctionStatus allowBid")
        .lean();

      if (newCars.length === 0) return;

      for (const search of searches) {
        const matched = newCars.filter(c => matches(c, search.filters));
        if (matched.length === 0) continue;

        const lastNotified = search.lastNotifiedAt
          ? new Date(search.lastNotifiedAt).getTime()
          : 0;
        const fresh = matched.filter(c => new Date(c.createdAt).getTime() > lastNotified);

        if (fresh.length === 0) continue;

        await SavedSearch.findByIdAndUpdate(search._id, { lastNotifiedAt: new Date() });

        const titles = fresh.slice(0, 3).map(c => c.title || `${c.brand || ""} ${c.year || ""}`).join(", ");
        const rest = fresh.length > 3 ? ` and ${fresh.length - 3} more` : "";

        await createNotification({
          user: search.user,
          title: `New matching vehicles: ${search.name}`,
          message: `${fresh.length} vehicle${fresh.length > 1 ? "s" : ""} added: ${titles}${rest}`,
          type: "info",
          data: { savedSearchId: search._id, count: fresh.length },
        });
      }
    } catch (err) {
      console.error("❌ SavedSearchCron error:", err.message);
    }
  };

  tick();
  setInterval(tick, CHECK_INTERVAL);
  console.log(`  ⏰ SavedSearchCron: ${CHECK_INTERVAL / 60000}-min cycle`);
};
