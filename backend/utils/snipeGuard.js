import { emitAuctionExtended } from "../socket/socket.js";

const SNIPE_WINDOW_MS = (parseInt(process.env.AUCTION_SNIPE_WINDOW_SECONDS, 10) || 120) * 1000;
const EXTENSION_MS = (parseInt(process.env.AUCTION_SNIPE_EXTENSION_SECONDS, 10) || 120) * 1000;

export { SNIPE_WINDOW_MS, EXTENSION_MS };

export const applySnipingProtection = async (car) => {
  if (!car.auctionEnd) return false;
  const now = Date.now();
  const end = new Date(car.auctionEnd).getTime();
  const remaining = end - now;
  if (remaining > 0 && remaining < SNIPE_WINDOW_MS) {
    car.auctionEnd = new Date(end + EXTENSION_MS);
    await car.save();
    const carId = car._id.toString();
    emitAuctionExtended(carId, car.auctionEnd);
    if (global.io) {
      global.io.to(`car_${carId}`).emit("timeExtended", { newEndTime: car.auctionEnd });
    }
    return true;
  }
  return false;
};

export const applyAuctionSnipingProtection = async (auction) => {
  const now = Date.now();
  const timeRemaining = auction.endTime - now;
  if (timeRemaining > 0 && timeRemaining < SNIPE_WINDOW_MS) {
    auction.endTime = new Date(auction.endTime.getTime() + EXTENSION_MS);
    auction.extendedCount = (auction.extendedCount || 0) + 1;
    return true;
  }
  return false;
};

export const applyRedisSnipingProtection = async (redis, roomId, endTime, now) => {
  if (endTime && endTime - now < SNIPE_WINDOW_MS) {
    const newEnd = now + EXTENSION_MS;
    await redis.set(`auction:${roomId}:end`, newEnd);
    emitAuctionExtended(roomId, { newEndTime: newEnd, extendedBy: EXTENSION_MS });
    return true;
  }
  return false;
};
