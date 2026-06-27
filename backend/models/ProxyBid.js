import mongoose from "mongoose";

const proxyBidSchema = new mongoose.Schema({
  auctionId: String,
  userId: String,
  maxBid: Number,
});

export default mongoose.model("ProxyBid", proxyBidSchema);
