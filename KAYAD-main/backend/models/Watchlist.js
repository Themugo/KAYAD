import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true },
  notified: { type: Boolean, default: false },
}, { timestamps: true });

watchlistSchema.index({ user: 1, auction: 1 }, { unique: true });

export default mongoose.model("Watchlist", watchlistSchema);
