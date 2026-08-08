/*
# user_preferences — a real, complete feature with no backing table

Found via the same TABLE_MAP-driven method sweep as the previous
commit's Bid/Car/User/IdempotencyKey fixes. controllers/
userPreferenceController.js is a genuinely real, complete feature (11
endpoints - theme, language, notifications, accessibility, recent
searches, last-seen tracking - each with real input validation, not
CRUD boilerplate) with zero backing table.

Column list is the complete `allowedFields` array from
updateUserPreferences plus the fields getOrCreate() initializes:
theme, themeColor, language, locale, timezone, dateFormat, currency
(scalars), notifications, privacy, display, bidding, search,
accessibility, lastSeen (JSONB - each is read/written as a nested
object throughout the controller, e.g. preferences.search.recentSearches,
preferences.lastSeen.mobile, preferences.notifications[channel]).
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  theme_color TEXT,
  language TEXT DEFAULT 'en',
  locale TEXT DEFAULT 'en',
  timezone TEXT,
  date_format TEXT,
  currency TEXT,
  notifications JSONB DEFAULT '{}',
  privacy JSONB DEFAULT '{}',
  display JSONB DEFAULT '{}',
  bidding JSONB DEFAULT '{}',
  search JSONB DEFAULT '{"recentSearches": []}',
  accessibility JSONB DEFAULT '{}',
  last_seen JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences("user");

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_snake();
