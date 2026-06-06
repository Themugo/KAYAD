import mongoose from "mongoose";

const globalSettingsSchema = new mongoose.Schema(
  {
    platformName: { type: String, default: "Kayad" },
    tagline: { type: String, default: "Kenya's Premium Car Marketplace" },
    supportEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },

    // =============================
    // 💰 FEES & COMMISSIONS
    // =============================
    dealerCommissionPct: { type: Number, default: 5 },
    buyerPremiumPct: { type: Number, default: 0 },
    bidCommitmentPct: { type: Number, default: 5 },
    escrowReleaseDays: { type: Number, default: 3 },
    maxListingImages: { type: Number, default: 8 },
    listingFee: { type: Number, default: 1000 },
    auctionRegistrationFee: { type: Number, default: 2000 },
    commissionPercentage: { type: Number, default: 2 },
    ghostCheckFee: { type: Number, default: 2500 },
    platformVat: { type: Number, default: 16 },

    // =============================
    // 🔄 FEATURES
    // =============================
    allowGuestBrowsing: { type: Boolean, default: true },
    requireDealerApproval: { type: Boolean, default: true },
    allowEscrow: { type: Boolean, default: true },
    allowAuction: { type: Boolean, default: true },
    isAuctionEnabled: { type: Boolean, default: true },

    // =============================
    // 🚨 SYSTEM STATUS (KILL SWITCHES)
    // =============================
    systemStatus: {
      isAuctionActive: { type: Boolean, default: true },
      isPaymentsActive: { type: Boolean, default: true },
      isGhostCheckActive: { type: Boolean, default: true },
      isMaintenanceMode: { type: Boolean, default: false },
      emergencyMessage: { type: String, default: "System under scheduled maintenance." },
    },

    // =============================
    // 🏷 ACTIVE PROMOS
    // =============================
    activePromos: [
      {
        code: String,
        discountPercent: Number,
        expiryDate: Date,
        targetRole: { type: String, enum: ["dealer", "individual", "all"], default: "all" },
      },
    ],

    // =============================
    // 🏦 M-PESA / DARAJA
    // =============================
    daraja: {
      environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
      shortCode: { type: String, default: "174379" },
      passkey: { type: String, default: "" },
      consumerKey: { type: String, default: "" },
      consumerSecret: { type: String, default: "" },
    },

    // =============================
    // 🏛 BANK TRANSFER
    // =============================
    bank: {
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      branch: { type: String, default: "" },
      swiftCode: { type: String, default: "" },
    },

    // =============================
    // ⏱ MAINTENANCE
    // =============================
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("GlobalSettings", globalSettingsSchema);
