import mongoose from "mongoose";

const adSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  imageUrl:   { type: String, required: true },
  targetLink: { type: String, default: "" },
  placement:  { type: String, enum: ["auction_sidebar", "sneak_peek_top", "bid_modal", "homepage_banner"], required: true },
  viewCount:  { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  expiryDate: Date,
  budgetRemaining: { type: Number, default: 0 },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Ad", adSchema);
