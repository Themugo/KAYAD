import { createModel } from "./_base.js";

const UserPreference = createModel("UserPreference");

// controllers/userPreferenceController.js is a real, complete feature
// (11 endpoints - theme, language, notifications, accessibility,
// recent searches, last-seen tracking, all with real input validation)
// with none of its required methods implemented anywhere. Different
// shape of gap from Bid/Car/User/IdempotencyKey earlier this session:
// getOrCreate is a static method (attached directly below, same
// pattern as those), but setTheme/setLanguage/updateNotifications/
// addRecentSearch/clearRecentSearches are called as INSTANCE methods
// on the document getOrCreate returns
// (`const preferences = await UserPreference.getOrCreate(userId);
// await preferences.setTheme(theme);`). wrapDoc() in models/_base.js
// only attaches .save() to every wrapped document - it has no concept
// of per-table custom instance methods, and modifying it to add some
// would affect every model in this codebase for the sake of one
// table's needs. Attached these 5 directly onto the specific document
// getOrCreate returns instead, scoped to just this file.

UserPreference.getOrCreate = async (userId) => {
  let prefs = await UserPreference.findOne({ user: userId });
  if (!prefs) {
    prefs = await UserPreference.create({
      user: userId,
      theme: "system",
      language: "en",
      locale: "en",
      notifications: {},
      privacy: {},
      display: {},
      bidding: {},
      search: { recentSearches: [] },
      accessibility: {},
      lastSeen: {},
    });
  }

  prefs.setTheme = async (theme) => {
    prefs.theme = theme;
    await prefs.save();
    return prefs;
  };

  prefs.setLanguage = async (language) => {
    prefs.language = language;
    prefs.locale = language;
    await prefs.save();
    return prefs;
  };

  prefs.updateNotifications = async (channel, settings) => {
    prefs.notifications = {
      ...prefs.notifications,
      [channel]: { ...(prefs.notifications?.[channel] || {}), ...settings },
    };
    await prefs.save();
    return prefs;
  };

  // Capped at 20 - a conservative, standard "recent items" limit;
  // nothing in the controller specifies one explicitly, but an
  // unbounded array here would grow forever with no eviction.
  prefs.addRecentSearch = async (query) => {
    const existing = prefs.search?.recentSearches || [];
    const updated = [query, ...existing.filter((q) => q !== query)].slice(0, 20);
    prefs.search = { ...prefs.search, recentSearches: updated };
    await prefs.save();
    return prefs;
  };

  prefs.clearRecentSearches = async () => {
    prefs.search = { ...prefs.search, recentSearches: [] };
    await prefs.save();
    return prefs;
  };

  return prefs;
};

export default UserPreference;
