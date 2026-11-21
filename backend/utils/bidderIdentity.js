import crypto from "crypto";

/** Anonymous per-auction bidder identity shown in the room (never the real name). Same value at registration and on bids. */
export function bidderNumber(userId, auctionId) {
  return `K-${crypto.createHash("sha256").update(`${auctionId}:${userId}:kayad`).digest("hex").slice(0, 8).toUpperCase()}`;
}
