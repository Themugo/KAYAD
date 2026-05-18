import mongoose from "mongoose";

const marketDataSchema = new mongoose.Schema({
  brand: { type: String, required: true, index: true },
  model: { type: String, required: true, index: true },
  year: { type: Number, required: true },
  bodyType: String,
  fuel: String,
  transmission: String,
  engineCC: Number,
  lowPrice: { type: Number, required: true },
  avgPrice: { type: Number, required: true },
  highPrice: { type: Number, required: true },
  sampleSize: { type: Number, default: 1 },
  source: { type: String, default: "platform" },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

marketDataSchema.index({ brand: 1, model: 1, year: -1 });
marketDataSchema.index({ brand: 1, model: 1, bodyType: 1 });

export default mongoose.model("MarketData", marketDataSchema);
