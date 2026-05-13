import mongoose from "mongoose";

const globalSettingsSchema = new mongoose.Schema(
  {
    // =============================
    // 🏪 PLATFORM INFO
    // =============================
    platformName: { type: String, default: "Kayad" },
    tagline:      { type: String, default: "Kenya's Premium Car Marketplace" },
    supportEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },

    // =============================
    // 💰 FEES & COMMISSIONS
    // =============================
    dealerCommissionPct: { type: Number, default: 5 },
    buyerPremiumPct:     { type: Number, default: 0 },
    bidCommitmentPct:    { type: Number, default: 5 },
    escrowReleaseDays:   { type: Number, default: 3 },
    maxListingImages:    { type: Number, default: 8 },

    // =============================
    // 🔄 FEATURES
    // =============================
    allowGuestBrowsing:    { type: Boolean, default: true },
    requireDealerApproval: { type: Boolean, default: true },
    allowEscrow:           { type: Boolean, default: true },
    allowAuction:          { type: Boolean, default: true },

    // =============================
    // 🏦 M-PESA / DARAJA
    // =============================
    daraja: {
      environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
      shortCode:   { type: String, default: "174379" },
      passkey:     { type: String, default: "" },
      consumerKey: { type: String, default: "" },
      consumerSecret: { type: String, default: "" },
    },

    // =============================
    // 🏛 BANK TRANSFER
    // =============================
    bank: {
      bankName:    { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      branch:      { type: String, default: "" },
      swiftCode:   { type: String, default: "" },
    },

    // =============================
    // ⏱ MAINTENANCE
    // =============================
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("GlobalSettings", globalSettingsSchema);
