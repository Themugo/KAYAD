import asyncHandler from "../middleware/asyncHandler.js";
import UserPreference from "../models/UserPreference.js";

// =============================
// 🎨 GET USER PREFERENCES
// =============================
export const getUserPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const preferences = await UserPreference.getOrCreate(userId);

  res.json({
    success: true,
    data: preferences,
  });
});

// =============================
// ✏️ UPDATE USER PREFERENCES
// =============================
export const updateUserPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;

  const preferences = await UserPreference.getOrCreate(userId);

  // Update allowed fields
  const allowedFields = [
    "theme",
    "themeColor",
    "language",
    "locale",
    "timezone",
    "dateFormat",
    "currency",
    "notifications",
    "privacy",
    "display",
    "bidding",
    "search",
    "accessibility",
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (typeof updates[field] === "object" && !Array.isArray(updates[field])) {
        // Merge nested objects
        preferences[field] = { ...preferences[field], ...updates[field] };
      } else {
        preferences[field] = updates[field];
      }
    }
  }

  await preferences.save();

  res.json({
    success: true,
    data: preferences,
  });
});

// =============================
// 🌙 SET THEME
// =============================
export const setTheme = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { theme } = req.body;

  if (!["light", "dark", "system"].includes(theme)) {
    return res.status(400).json({
      success: false,
      message: "Invalid theme. Use 'light', 'dark', or 'system'",
    });
  }

  const preferences = await UserPreference.getOrCreate(userId);
  await preferences.setTheme(theme);

  res.json({
    success: true,
    data: {
      theme: preferences.theme,
      isDarkMode: preferences.theme === "dark",
    },
  });
});

// =============================
// 🔄 TOGGLE DARK MODE
// =============================
export const toggleDarkMode = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const preferences = await UserPreference.getOrCreate(userId);

  // Toggle between dark and light (respecting system preference)
  const currentTheme = preferences.theme;
  const newTheme = currentTheme === "dark" ? "light" : currentTheme === "light" ? "system" : "dark";

  await preferences.setTheme(newTheme);

  res.json({
    success: true,
    data: {
      theme: preferences.theme,
      previousTheme: currentTheme,
      isDarkMode: preferences.theme === "dark",
    },
  });
});

// =============================
// 🌍 SET LANGUAGE
// =============================
export const setLanguage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { language } = req.body;

  if (!["en", "sw", "ar", "zh", "de", "fr", "es", "pt"].includes(language)) {
    return res.status(400).json({
      success: false,
      message: "Invalid language code",
    });
  }

  const preferences = await UserPreference.getOrCreate(userId);
  await preferences.setLanguage(language);

  res.json({
    success: true,
    data: {
      language: preferences.language,
      locale: preferences.locale,
    },
  });
});

// =============================
// 🔔 UPDATE NOTIFICATION SETTINGS
// =============================
export const updateNotificationSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { channel, settings } = req.body;

  if (!["email", "push", "sms"].includes(channel)) {
    return res.status(400).json({
      success: false,
      message: "Invalid notification channel",
    });
  }

  const preferences = await UserPreference.getOrCreate(userId);
  await preferences.updateNotifications(channel, settings);

  res.json({
    success: true,
    data: preferences.notifications,
  });
});

// =============================
// 🔍 ADD RECENT SEARCH
// =============================
export const addRecentSearch = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Query is required",
    });
  }

  const preferences = await UserPreference.getOrCreate(userId);
  await preferences.addRecentSearch(query);

  res.json({
    success: true,
    data: {
      recentSearches: preferences.search.recentSearches,
    },
  });
});

// =============================
// 🗑️ CLEAR RECENT SEARCHES
// =============================
export const clearRecentSearches = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const preferences = await UserPreference.getOrCreate(userId);
  await preferences.clearRecentSearches();

  res.json({
    success: true,
    data: {
      recentSearches: [],
    },
  });
});

// =============================
// ♿ UPDATE ACCESSIBILITY
// =============================
export const updateAccessibility = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { reducedMotion, highContrast, fontSize, screenReader } = req.body;

  const preferences = await UserPreference.getOrCreate(userId);

  if (reducedMotion !== undefined) preferences.accessibility.reducedMotion = reducedMotion;
  if (highContrast !== undefined) preferences.accessibility.highContrast = highContrast;
  if (fontSize) preferences.accessibility.fontSize = fontSize;
  if (screenReader !== undefined) preferences.accessibility.screenReader = screenReader;

  await preferences.save();

  res.json({
    success: true,
    data: preferences.accessibility,
  });
});

// =============================
// 📱 UPDATE LAST SEEN
// =============================
export const updateLastSeen = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { platform = "web" } = req.body;

  const preferences = await UserPreference.getOrCreate(userId);

  if (platform === "mobile") {
    preferences.lastSeen.mobile = new Date();
  } else {
    preferences.lastSeen.web = new Date();
  }

  await preferences.save();

  res.json({
    success: true,
    data: {
      lastSeen: preferences.lastSeen,
    },
  });
});

// =============================
// 📊 GET PREFERENCE STATISTICS
// =============================
export const getPreferenceStats = asyncHandler(async (req, res) => {
  const stats = await UserPreference.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        themes: {
          light: { $sum: { $cond: [{ $eq: ["$theme", "light"] }, 1, 0] } },
          dark: { $sum: { $cond: [{ $eq: ["$theme", "dark"] }, 1, 0] } },
          system: { $sum: { $cond: [{ $eq: ["$theme", "system"] }, 1, 0] } },
        },
        languages: { $addToSet: "$language" },
        pushEnabled: { $sum: { $cond: ["$notifications.push.enabled", 1, 0] } },
        emailNotifications: { $sum: { $cond: ["$notifications.email.bids", 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        themes: 1,
        uniqueLanguages: { $size: "$languages" },
        pushEnabled: 1,
        emailNotifications: 1,
      },
    },
  ]);

  res.json({
    success: true,
    data: stats[0] || {},
  });
});
