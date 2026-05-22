import Favorite from "../models/Favorite.js";
import Car from "../models/Car.js";
import { sendNotification } from "./notification.service.js";

const CHECK_INTERVAL = 15 * 60 * 1000;

export function startPriceAlertCron() {
  console.log(`  ⏰ PriceAlertCron: ${CHECK_INTERVAL / 60000}-min cycle`);
  run();
  const timer = setInterval(run, CHECK_INTERVAL);
  return timer;
}

export function stopPriceAlertCron(timer) {
  if (timer) clearInterval(timer);
}

async function run() {
  try {
    const alerts = await Favorite.find({ notifyOnPriceDrop: true })
      .populate({ path: "car", select: "price title images brand" })
      .populate({ path: "user", select: "email phone name" })
      .lean();

    for (const fav of alerts) {
      const car = fav.car;
      if (!car) continue;

      const oldPrice = fav.carSnapshot?.price;
      const newPrice = car.price;

      if (oldPrice != null && newPrice != null && newPrice < oldPrice) {
        const drop = oldPrice - newPrice;
        const pct = ((drop / oldPrice) * 100).toFixed(1);
        const title = car.title || `${car.brand || "Car"} price dropped`;
        const message = `${car.title || "A saved car"} dropped from KES ${oldPrice.toLocaleString()} to KES ${newPrice.toLocaleString()} (${pct}% off)`;

        await sendNotification({
          userId: fav.user?._id || fav.user,
          title: `💰 Price Drop: ${title}`,
          message,
          type: "price_alert",
          email: fav.user?.email,
          phone: fav.user?.phone,
        });

        await Favorite.updateOne(
          { _id: fav._id },
          { $set: { "carSnapshot.price": newPrice } }
        );
      }
    }
  } catch (err) {
    console.error("❌ PriceAlertCron error:", err.message);
  }
}
