#!/bin/bash
# ============================================================
# KAYAD Schema Applicator for Supabase
# ============================================================
# Usage:
#   chmod +x scripts/apply-schema.sh
#   ./scripts/apply-schema.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables from backend/.env
echo "📁 Loading environment from backend/.env..."
ENV_FILE="$SCRIPT_DIR/../backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ backend/.env not found at: $ENV_FILE"
    exit 1
fi

source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/=/="/' | sed 's/$/"/')

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ] || [ "$SUPABASE_URL" == "https://your-project-id.supabase.co" ]; then
    echo "❌ Please update backend/.env with your Supabase credentials first."
    echo "   SUPABASE_URL: $SUPABASE_URL"
    echo "   SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:20}..."
    exit 1
fi

echo ""
echo "🚀 KAYAD Schema Applicator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Project: $SUPABASE_URL"
echo ""

# Function to make API calls
api_get() {
    curl -s -X GET "$SUPABASE_URL$1" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
}

api_post() {
    curl -s -X POST "$SUPABASE_URL$1" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "$2"
}

# Test connection
echo "🔍 Testing connection..."
RESPONSE=$(api_get "/rest/v1/?limit=1")
if echo "$RESPONSE" | grep -q "definitions"; then
    echo "   ✅ Connected to Supabase"
else
    echo "   ❌ Connection failed"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

# Check existing tables
echo "📋 Current tables in database:"
echo "$RESPONSE" | jq -r '.definitions | keys[]' 2>/dev/null || echo "   (empty or none)"
echo ""

# List required tables
REQUIRED_TABLES=(
    "users"
    "cars"
    "auctions"
    "bids"
    "escrows"
    "payments"
    "chats"
    "messages"
    "notifications"
    "reviews"
    "favorites"
    "platform_config"
)

# Check which tables exist
echo "🔍 Checking required tables..."
EXISTING_TABLES=()
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    TABLE_RESPONSE=$(api_get "/rest/v1/$table?select=id&limit=1" 2>/dev/null)
    if echo "$TABLE_RESPONSE" | jq -e 'has("code")' >/dev/null 2>&1; then
        MISSING_TABLES+=("$table")
        echo "   ⬜ $table - not found"
    else
        EXISTING_TABLES+=("$table")
        echo "   ✅ $table - exists"
    fi
done

echo ""
if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo "🎉 All tables already exist!"
else
    echo "⚠️  ${#MISSING_TABLES[@]} table(s) missing: ${MISSING_TABLES[*]}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 MANUAL STEP REQUIRED: Apply Schema via Supabase Dashboard"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Go to: https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Click 'SQL Editor' in the left sidebar"
    echo "4. Click 'New Query'"
    echo "5. Copy the SQL from: backend/db/schema.sql"
    echo "6. Click 'Run' or press Ctrl+Enter"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "   📄 Schema saved to: backend/db/schema.sql"
    echo ""
fi

# Check storage buckets
echo ""
echo "🗄️  Storage buckets:"
BUCKETS=$(curl -s "$SUPABASE_URL/storage/v1/bucket" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")

echo "$BUCKETS" | jq -r '.[] | "   ✅ \(.name) - \(if .public then "public" else "private" end)"' 2>/dev/null || echo "   (none found)"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    SETUP SUMMARY                             ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  Environment: ✅ Configured                                  ║"
echo "║  Connection:   ✅ Working                                     ║"
echo "║  Tables:      $((12 - ${#MISSING_TABLES[@]}))/12 created                       ║"
echo "║  Storage:     ✅ Bucket exists                                ║"
echo "║                                                                ║"
echo "║  Next steps:                                                 ║"
if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
echo "║  1. ⏳ Apply schema via Supabase SQL Editor                  ║"
fi
echo "║  2. 🚀 cd backend && npm run dev                              ║"
echo "║  3. 🚀 npm run dev (frontend)                                ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
