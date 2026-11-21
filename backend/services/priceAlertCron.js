import { sendNotification } from "./notification.service.js";
import { logInfo, logWarn } from "../utils/logger.js";
import { findAll, findOne, update } from "../db/index.js";
import { isSupabaseConnected } from "../utils/supabase.js";

const CHECK_INTERVAL = 15 * 60 * 1000;

export function startPriceAlertCron() {
  if (!isSupabaseConnected()) {
    logWarn("PriceAlertCron skipped: Supabase not connected");
    return;
  }

  logInfo(`PriceAlertCron: ${CHECK_INTERVAL / 60000}-min cycle`);
  run();
  setInterval(run, CHECK_INTERVAL);
}

async function run() {
  try {
    const alerts = await findAll("favorites", { filters: { notifyOnPriceDrop: true } });
    if (alerts.length === 0) return;

    for (const fav of alerts) {
      const car = fav.car ? await findOne("cars", { id: fav.car }) : null;
      if (!car) continue;

      const user = fav.user ? await findOne("users", { id: fav.user }) : null;
      const oldPrice = fav.carSnapshot?.price;
      const newPrice = car.price;

      if (oldPrice != null && newPrice != null && newPrice < oldPrice) {
        const drop = oldPrice - newPrice;
        const pct = ((drop / oldPrice) * 100).toFixed(1);
        const title = car.title || `${car.brand || "Car"} price dropped`;
        const message = `${car.title || "A saved car"} dropped from KES ${oldPrice.toLocaleString()} to KES ${newPrice.toLocaleString()} (${pct}% off)`;

        await sendNotification({
          userId: fav.user,
          title: `💰 Price Drop: ${title}`,
          message,
          type: "price_alert",
          email: user?.email,
          phone: user?.phone,
        });

        await update("favorites", fav.id, {
          carSnapshot: { ...fav.carSnapshot, price: newPrice },
        });
      }
    }
  } catch (err) {
    console.error("❌ PriceAlertCron error:", err.message);
  }
}
