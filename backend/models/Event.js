import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 USER
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sessionId: String,

    // =============================
    // 🎯 EVENT TYPE
    // =============================
    eventType: {
      type: String,
      required: true,
      enum: [
        // Search events
        "search_performed",
        "filter_applied",
        "sort_applied",

        // Vehicle events
        "vehicle_viewed",
        "vehicle_favorite_added",
        "vehicle_favorite_removed",
        "vehicle_shared",

        // Lead events
        "lead_created",
        "offer_sent",
        "offer_accepted",
        "offer_rejected",

        // Auction events
        "auction_joined",
        "bid_placed",
        "outbid",
        "auction_won",
        "auction_lost",

        // Escrow events
        "escrow_started",
        "escrow_funded",
        "escrow_released",
        "escrow_refunded",
        "escrow_disputed",

        // Chat events
        "message_sent",
        "message_received",

        // Account events
        "account_created",
        "account_verified",
        "login",
        "logout",

        // Support events
        "support_ticket_created",
        "support_ticket_resolved",
      ],
      index: true,
    },

    // =============================
    // 🎯 TARGET
    // =============================
    targetType: {
      type: String,
      enum: ["car", "auction", "escrow", "user", "dealer", "search", "support_ticket"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    // =============================
    // 📊 EVENT DATA
    // =============================
    data: {
      type: Object,
      default: {},
    },

    // =============================
    // 🌐 REQUEST INFO
    // =============================
    ipAddress: String,
    userAgent: String,
    referrer: String,
    url: String,

    // =============================
    // 📱 DEVICE INFO
    // =============================
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet"],
    },
    browser: String,
    os: String,
  },
  { timestamps: true },
);

// Indexes for efficient queries
eventSchema.index({ eventType: 1, createdAt: -1 });
eventSchema.index({ user: 1, eventType: 1, createdAt: -1 });
eventSchema.index({ targetId: 1, eventType: 1 });
eventSchema.index({ createdAt: -1 }); // TTL index for old events

// TTL index - events expire after 90 days
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.Event || mongoose.model("Event", eventSchema);
