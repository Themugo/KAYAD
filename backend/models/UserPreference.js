import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Theme preferences
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    themeColor: {
      type: String,
      enum: ["default", "blue", "green", "purple", "orange"],
      default: "default",
    },
    // Language and locale
    language: {
      type: String,
      enum: ["en", "sw", "ar", "zh", "de", "fr", "es", "pt"],
      default: "en",
    },
    locale: {
      type: String,
      default: "en-KE",
    },
    timezone: {
      type: String,
      default: "Africa/Nairobi",
    },
    dateFormat: {
      type: String,
      enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
      default: "DD/MM/YYYY",
    },
    currency: {
      type: String,
      default: "KES",
    },
    // Notification preferences
    notifications: {
      email: {
        bids: { type: Boolean, default: true },
        auctions: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        updates: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
      },
      push: {
        enabled: { type: Boolean, default: true },
        bids: { type: Boolean, default: true },
        auctions: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
      },
      sms: {
        bids: { type: Boolean, default: false },
        transactions: { type: Boolean, default: true },
      },
    },
    // Privacy settings
    privacy: {
      showProfile: { type: Boolean, default: true },
      showBids: { type: Boolean, default: true },
      showActivity: { type: Boolean, default: true },
      allowTracking: { type: Boolean, default: false },
    },
    // Display preferences
    display: {
      compactMode: { type: Boolean, default: false },
      showTutorialHints: { type: Boolean, default: true },
      imageQuality: {
        type: String,
        enum: ["auto", "high", "medium", "low"],
        default: "auto",
      },
      listView: {
        type: String,
        enum: ["grid", "list"],
        default: "grid",
      },
    },
    // Bidding preferences
    bidding: {
      autoBidEnabled: { type: Boolean, default: false },
      maxAutoBidIncrement: { type: Number, default: 5000 },
      outbidNotifications: { type: Boolean, default: true },
      auctionReminders: { type: Boolean, default: true },
      reminderTime: { type: Number, default: 15 }, // minutes before
    },
    // Search preferences
    search: {
      recentSearches: { type: [String], default: [] },
      savedFilters: { type: mongoose.Schema.Types.Mixed, default: {} },
      defaultSort: {
        type: String,
        enum: ["relevance", "price_low", "price_high", "newest", "ending_soon"],
        default: "relevance",
      },
    },
    // Accessibility
    accessibility: {
      reducedMotion: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      fontSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      screenReader: { type: Boolean, default: false },
    },
    // Marketing consent
    marketingConsent: {
      given: { type: Boolean, default: false },
      givenAt: { type: Date },
      source: { type: String },
    },
    // Last seen tracking
    lastSeen: {
      web: { type: Date },
      mobile: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userPreferenceSchema.index({ "notifications.email.marketing": 1 });
userPreferenceSchema.index({ language: 1 });
userPreferenceSchema.index({ theme: 1 });

// Static method to get or create preferences
userPreferenceSchema.statics.getOrCreate = async function (userId) {
  let prefs = await this.findOne({ user: userId });
  if (!prefs) {
    prefs = await this.create({ user: userId });
  }
  return prefs;
};

// Method to update theme
userPreferenceSchema.methods.setTheme = async function (theme) {
  this.theme = theme;
  return this.save();
};

// Method to toggle dark mode
userPreferenceSchema.methods.toggleDarkMode = async function () {
  this.theme = this.theme === "dark" ? "light" : "light";
  return this.save();
};

// Method to set language
userPreferenceSchema.methods.setLanguage = async function (language) {
  this.language = language;
  // Update locale based on language
  const localeMap = {
    en: "en-KE",
    sw: "sw-KE",
    ar: "ar-SA",
    zh: "zh-CN",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    pt: "pt-BR",
  };
  this.locale = localeMap[language] || "en-KE";
  return this.save();
};

// Method to add recent search
userPreferenceSchema.methods.addRecentSearch = async function (query) {
  if (!query || query.length < 2) return this;
  this.search.recentSearches = [
    query,
    ...this.search.recentSearches.filter((s) => s !== query),
  ].slice(0, 10);
  return this.save();
};

// Method to clear recent searches
userPreferenceSchema.methods.clearRecentSearches = async function () {
  this.search.recentSearches = [];
  return this.save();
};

// Method to update notification settings
userPreferenceSchema.methods.updateNotifications = async function (channel, settings) {
  if (this.notifications[channel]) {
    this.notifications[channel] = { ...this.notifications[channel], ...settings };
  }
  return this.save();
};

// Virtual for isDarkMode
userPreferenceSchema.virtual("isDarkMode").get(function () {
  return this.theme === "dark";
});

const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);

export default UserPreference;
