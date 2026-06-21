import mongoose from "mongoose";

const smsBidderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    // Active auction subscriptions — the user gets SMS updates for these cars
    subscriptions: [
      {
        car: { type: mongoose.Schema.Types.ObjectId, ref: "Car" },
        notifyOnOutbid: { type: Boolean, default: true },
        autoBid: { type: Boolean, default: false },
        maxAutoBid: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastBidAt: Date,
    totalSmsBids: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("SmsBidder", smsBidderSchema);
