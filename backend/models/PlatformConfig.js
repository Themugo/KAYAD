import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  id:           { type: String }, // starter | growth | elite | enterprise | seller_basic | seller_pro
  name:         { type: String },
  priceMonthly: { type: Number, default: 0 },       // KES
  priceAnnual:  { type: Number, default: 0 },       // KES — 0 = same as monthly*12
  listingMax:   { type: Number, default: 5 },        // 0 = unlimited
  durationDays: { type: Number, default: 30 },
  isActive:     { type: Boolean, default: true },
  isFree:       { type: Boolean, default: false },   // admin waiver
  trialDays:    { type: Number, default: 0 },          // 0 = no trial; >0 = free trial period
  trialListingMax: { type: Number, default: 0 },       // max listings during trial (0 = use listingMax)
  forRole:      { type: String, enum: ["dealer", "seller", "both"], default: "dealer" },
  features:     [String],                            // e.g. ["priority_search","featured_homepage"]
  description:  { type: String, default: "" },
}, { _id: false });

const platformConfigSchema = new mongoose.Schema({
  // Platform Info
  platformName:      { type: String, default: "Kayad" },
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
  waivePayments:         { type: Boolean, default: false },
  freeMarket:            { type: Boolean, default: false },

  // ── LISTING PACKAGES ────────────────────────────────
  // Admin controls all prices without code changes
  packages: {
    type: [packageSchema],
    default: [
      // Dealer packages
      // Dealer packages — starter is FREE for 30 days (3 listings), then KES 2,500/mo
      { id:"starter",      name:"Starter",      priceMonthly:0,     listingMax:3,   forRole:"dealer",  isActive:true,  isFree:true,  trialDays:30,  trialListingMax:3,  features:[],                                             description:"Free for your first 30 days — up to 3 listings. KES 2,500/mo after." },
      { id:"growth",       name:"Growth",      priceMonthly:6500,  listingMax:30,  forRole:"dealer",  isActive:true,  isFree:false, features:["priority_search"],                            description:"Grow your online presence" },
      { id:"elite",        name:"Elite",       priceMonthly:14000, listingMax:100, forRole:"dealer",  isActive:true,  isFree:false, features:["priority_search","featured_homepage"],        description:"For established dealers" },
      { id:"enterprise",   name:"Enterprise",  priceMonthly:0,     listingMax:0,   forRole:"dealer",  isActive:true,  isFree:false, features:["priority_search","featured_homepage","api","dedicated_support"], description:"Custom enterprise plan" },
      // Seller (individual / broker) packages
      // Seller packages — first vehicle always free
      { id:"seller_basic", name:"Basic Seller", priceMonthly:0,     listingMax:1,   forRole:"seller",  isActive:true,  isFree:true,  trialDays:0,   trialListingMax:1,  features:[],                                             description:"Your first vehicle listed for free — no credit card needed." },
      { id:"seller_pro",   name:"Pro Seller",  priceMonthly:1500,  listingMax:10,  forRole:"seller",  isActive:true,  isFree:false, features:["priority_search"],                            description:"Serious private sellers" },
    ],
  },

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
    defaultNarration:  { type: String, default: "Kayad Vehicle Payment" },
  },
}, { timestamps: true });

const PlatformConfig =
  mongoose.models.PlatformConfig ||
  mongoose.model("PlatformConfig", platformConfigSchema);

export default PlatformConfig;
