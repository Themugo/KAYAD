import { emitAuctionExtended } from "../socket/socket.js";
import { getIO } from "./io.js";

const SNIPE_WINDOW_MS = (parseInt(process.env.AUCTION_SNIPE_WINDOW_SECONDS, 10) || 120) * 1000;
const EXTENSION_MS = (parseInt(process.env.AUCTION_SNIPE_EXTENSION_SECONDS, 10) || 120) * 1000;
const MAX_EXTENSIONS = parseInt(process.env.AUCTION_MAX_EXTENSIONS, 10) || 5;
const MAX_TOTAL_EXTENSION_MS = parseInt(process.env.AUCTION_MAX_TOTAL_EXTENSION_SECONDS, 10) || 600;
const MAX_TOTAL_EXTENSION_MS_CALC = MAX_TOTAL_EXTENSION_MS * 1000;

export { SNIPE_WINDOW_MS, EXTENSION_MS, MAX_EXTENSIONS };

export const applySnipingProtection = async (car) => {
  if (!car.auctionEnd) return false;
  const now = Date.now();
  const end = new Date(car.auctionEnd).getTime();
  const remaining = end - now;
  if (remaining > 0 && remaining < SNIPE_WINDOW_MS) {
    const extensionCount = (car.extensionCount || 0) + 1;
    if (extensionCount > MAX_EXTENSIONS) return false;
    const totalExtended = extensionCount * EXTENSION_MS;
    if (totalExtended > MAX_TOTAL_EXTENSION_MS_CALC) return false;
    car.auctionEnd = new Date(end + EXTENSION_MS);
    car.extensionCount = extensionCount;
    await car.save();
    const carId = car._id.toString();
    emitAuctionExtended(carId, car.auctionEnd);
    if (getIO()) {
      getIO().to(`car_${carId}`).emit("timeExtended", { newEndTime: car.auctionEnd });
    }
    return true;
  }
  return false;
};

export const applyAuctionSnipingProtection = async (auction) => {
  const now = Date.now();
  const timeRemaining = auction.endTime - now;
  if (timeRemaining > 0 && timeRemaining < SNIPE_WINDOW_MS) {
    const extendedCount = (auction.extendedCount || 0) + 1;
    if (extendedCount > MAX_EXTENSIONS) return false;
    const totalExtended = extendedCount * EXTENSION_MS;
    if (totalExtended > MAX_TOTAL_EXTENSION_MS_CALC) return false;
    auction.endTime = new Date(auction.endTime.getTime() + EXTENSION_MS);
    auction.extendedCount = extendedCount;
    return true;
  }
  return false;
};

export const applyRedisSnipingProtection = async (redis, roomId, endTime, now) => {
  if (!endTime || endTime - now >= SNIPE_WINDOW_MS) return false;

  const extKey = `auction:${roomId}:extensions`;
  const currentExt = Number(await redis.get(extKey)) || 0;
  if (currentExt >= MAX_EXTENSIONS) return false;
  const totalExtended = (currentExt + 1) * EXTENSION_MS;
  if (totalExtended > MAX_TOTAL_EXTENSION_MS_CALC) return false;

  const newEnd = now + EXTENSION_MS;
  await redis.set(`auction:${roomId}:end`, newEnd);
  await redis.incr(extKey);
  emitAuctionExtended(roomId, newEnd);
  return true;
};
