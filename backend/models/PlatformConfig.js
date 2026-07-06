import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    id: { type: String }, // starter | growth | elite | enterprise | seller_basic | seller_pro
    name: { type: String },
    priceMonthly: { type: Number, default: 0 }, // KES
    priceAnnual: { type: Number, default: 0 }, // KES — 0 = same as monthly*12
    listingMax: { type: Number, default: 5 }, // 0 = unlimited
    durationDays: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    isFree: { type: Boolean, default: false }, // admin waiver
    trialDays: { type: Number, default: 0 }, // 0 = no trial; >0 = free trial period
    trialListingMax: { type: Number, default: 0 }, // max listings during trial (0 = use listingMax)
    forRole: { type: String, enum: ["dealer", "seller", "both"], default: "dealer" },
    features: [String], // e.g. ["priority_search","featured_homepage"]
    description: { type: String, default: "" },
  },
  { _id: false },
);

const platformConfigSchema = new mongoose.Schema(
  {
    // Platform Info
    platformName: { type: String, default: "Kayad" },
    supportEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },

    // Fees & Limits
    dealerCommission: { type: Number, default: 5 },
    bidCommitmentPct: { type: Number, default: 5 },
    escrowReleaseDays: { type: Number, default: 3 },
    maxListingImages: { type: Number, default: 8 },

    // Toggles — defaults set for LAUNCH MODE: everything free and open so the
    // marketplace can fill with real inventory. Flip any of these from the admin
    // Settings page (no code change) once you're ready to monetise.
    allowGuestBrowsing: { type: Boolean, default: true },
    requireDealerApproval: { type: Boolean, default: false }, // dealers auto-approved for now
    waivePayments: { type: Boolean, default: true }, // no listing/enrolment fees yet
    freeMarket: { type: Boolean, default: true }, // tiers exist but aren't enforced yet
    demoMode: { type: Boolean, default: true }, // show demo content in marketplace

    // ── BRANDING ──────────────────────────────────────────
    branding: {
      logoText: { type: String, default: "K" },
      logoType: { type: String, enum: ["text", "image", "icon"], default: "icon" },
      logoUrl: { type: String, default: "" },
      brandTagline: { type: String, default: "Premium Marketplace" },
      primaryColor: { type: String, default: "#D4A843" },
      accentColor: { type: String, default: "#F0CC6A" },
      bgColor: { type: String, default: "#050505" },
      surfaceColor: { type: String, default: "#0A0A0A" },
      cardColor: { type: String, default: "#111111" },
      textColor: { type: String, default: "#E2DDD5" },
    },

    // ── TYPOGRAPHY ──────────────────────────────────────
    fontDisplay: { type: String, default: "Cormorant Garamond" },
    fontBody: { type: String, default: "DM Sans" },
    fontSizePct: { type: Number, default: 110 }, // 110% = 10% bigger globally
    baseFontSize: { type: Number, default: 17 }, // px
    lineHeight: { type: Number, default: 1.8 },

    // ── LISTING PACKAGES ────────────────────────────────
    // Admin controls all prices without code changes
    packages: {
      type: [packageSchema],
      default: [
        // Dealer packages
        // Dealer packages — starter is FREE for 30 days (3 listings), then KES 2,500/mo
        {
          id: "starter",
          name: "Starter",
          priceMonthly: 0,
          listingMax: 3,
          forRole: "dealer",
          isActive: true,
          isFree: true,
          trialDays: 30,
          trialListingMax: 3,
          features: [],
          description: "Free for your first 30 days — up to 3 listings. KES 2,500/mo after.",
        },
        {
          id: "growth",
          name: "Growth",
          priceMonthly: 6500,
          listingMax: 30,
          forRole: "dealer",
          isActive: true,
          isFree: false,
          features: ["priority_search"],
          description: "Grow your online presence",
        },
        {
          id: "elite",
          name: "Elite",
          priceMonthly: 14000,
          listingMax: 100,
          forRole: "dealer",
          isActive: true,
          isFree: false,
          features: ["priority_search", "featured_homepage"],
          description: "For established dealers",
        },
        {
          id: "enterprise",
          name: "Enterprise",
          priceMonthly: 0,
          listingMax: 0,
          forRole: "dealer",
          isActive: true,
          isFree: false,
          features: ["priority_search", "featured_homepage", "api", "dedicated_support"],
          description: "Custom enterprise plan",
        },
        // Seller (individual) packages
        // Seller packages — first vehicle always free
        {
          id: "seller_basic",
          name: "Basic Seller",
          priceMonthly: 0,
          listingMax: 1,
          forRole: "seller",
          isActive: true,
          isFree: true,
          trialDays: 0,
          trialListingMax: 1,
          features: [],
          description: "Your first vehicle listed for free — no credit card needed.",
        },
        {
          id: "seller_pro",
          name: "Pro Seller",
          priceMonthly: 1500,
          listingMax: 10,
          forRole: "seller",
          isActive: true,
          isFree: false,
          features: ["priority_search"],
          description: "Serious private sellers",
        },
      ],
    },

    // Daraja / M-Pesa
    daraja: {
      environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
      consumerKey: { type: String, default: "" },
      consumerSecret: { type: String, default: "" },
      passkey: { type: String, default: "" },
      shortCode: { type: String, default: "" },
    },

    // Bank Transfer
    bank: {
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      branch: { type: String, default: "" },
      swiftCode: { type: String, default: "" },
      reconciliationEmail: { type: String, default: "" },
    },

    // Reconciliation
    reconciliation: {
      autoReconcile: { type: Boolean, default: true },
      matchThresholdMins: { type: Number, default: 1440 },
      schedule: { type: String, default: "every 6 hours" },
      notifyOnMismatch: { type: Boolean, default: true },
      defaultNarration: { type: String, default: "Kayad Vehicle Payment" },
    },
  },
  { timestamps: true },
);

const PlatformConfig = mongoose.models.PlatformConfig || mongoose.model("PlatformConfig", platformConfigSchema);

export default PlatformConfig;
