import mongoose from "mongoose";

const platformConfigSchema = new mongoose.Schema({
  // Platform Info
  platformName:      { type: String, default: "Giclan Motors" },
  supportEmail:      { type: String, default: "" },
  supportPhone:      { type: String, default: "" },

  // Fees & Limits
  dealerCommission:  { type: Number, default: 5 },
  bidCommitmentPct:  { type: Number, default: 5 },
  escrowReleaseDays: { type: Number, default: 3 },
  maxListingImages:  { type: Number, default: 8 },

  // Toggles
  allowGuestBrowsing:    { type: Boolean, default: true },
  requireDealerApproval: { type: Boolean, default: true },

  // Daraja / M-Pesa
  daraja: {
    environment:    { type: String, enum: ["sandbox", "production"], default: "sandbox" },
    consumerKey:    { type: String, default: "" },
    consumerSecret: { type: String, default: "" },
    passkey:        { type: String, default: "" },
    shortCode:      { type: String, default: "" },
  },

  // Bank Transfer
  bank: {
    bankName:    { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    branch:      { type: String, default: "" },
    swiftCode:   { type: String, default: "" },
    reconciliationEmail: { type: String, default: "" },
  },

  // Reconciliation
  reconciliation: {
    autoReconcile:     { type: Boolean, default: true },
    matchThresholdMins: { type: Number, default: 1440 },
    schedule:          { type: String, default: "every 6 hours" },
    notifyOnMismatch:  { type: Boolean, default: true },
    defaultNarration:  { type: String, default: "Giclan Motors Vehicle Payment" },
  },
}, { timestamps: true });

const PlatformConfig =
  mongoose.models.PlatformConfig ||
  mongoose.model("PlatformConfig", platformConfigSchema);

export default PlatformConfig;
