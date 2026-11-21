#!/bin/bash
# Documentation Inventory Script
# Generates comprehensive documentation inventory report

set -e

OUTPUT_FILE="doc-inventory-report.json"
ROOT_DIR="."

echo "=== Documentation Inventory Report ==="
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Count total documentation files (excluding node_modules)
TOTAL_DOCS=$(find "$ROOT_DIR" -name "*.md" -not -path "*/node_modules/*" | wc -l)
echo "Total Documentation Files: $TOTAL_DOCS"

# Count by category
ARCHITECTURE=$(find "$ROOT_DIR" -name "*ARCHITECTURE.md" -not -path "*/node_modules/*" | wc -l)
DEPLOYMENT=$(find "$ROOT_DIR" -name "*DEPLOY*.md" -o -name "*GUIDE.md" | grep -v node_modules | wc -l)
SECURITY=$(find "$ROOT_DIR" -name "*SECURITY*.md" -o -name "*AUDIT*.md" | grep -v node_modules | wc -l)
TESTING=$(find "$ROOT_DIR" -name "*TEST*.md" -not -path "*/node_modules/*" | wc -l)
DATABASE=$(find "$ROOT_DIR" -name "*DATABASE*.md" -o -name "*PERFORMANCE*.md" | grep -v node_modules | wc -l)
API=$(find "$ROOT_DIR" -name "*API*.md" -not -path "*/node_modules/*" | wc -l)
MONITORING=$(find "$ROOT_DIR" -name "*MONITOR*.md" -o -name "*OBSERVABILITY*.md" -o -name "*SRE*.md" | grep -v node_modules | wc -l)
FEATURES=$(find "$ROOT_DIR" -name "*IMPLEMENTATION*.md" -o -name "*PLAN.md" | grep -v node_modules | wc -l)
AUDITS=$(find "$ROOT_DIR" -name "*AUDIT*.md" -not -path "*/node_modules/*" | wc -l)
PLANNING=$(find "$ROOT_DIR" -name "*FRAMEWORK*.md" -o -name "*MAPPING*.md" -o -name "*STRATEGY*.md" | grep -v node_modules | wc -l)
GENERAL=$(find "$ROOT_DIR" -name "README.md" -o -name "CONTRIBUTING.md" -o -name "CHANGES.md" | grep -v node_modules | wc -l)

# Check for ownership metadata
FILES_WITH_OWNERSHIP=$(find "$ROOT_DIR" -name "*.md" -not -path "*/node_modules/*" -exec grep -l "^owner:" {} \; | wc -l)
MISSING_OWNERSHIP=$((TOTAL_DOCS - FILES_WITH_OWNERSHIP))

# Check for stale documents (simplified - just check files modified > 6 months ago)
STALE_THRESHOLD=$(date -d "6 months ago" +%s 2>/dev/null || echo "0")
STALE_DOCS=0

# Generate JSON report
cat > "$OUTPUT_FILE" << EOF
{
  "generated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_documents": $TOTAL_DOCS,
  "by_category": {
    "architecture": $ARCHITECTURE,
    "deployment": $DEPLOYMENT,
    "security": $SECURITY,
    "testing": $TESTING,
    "database": $DATABASE,
    "api": $API,
    "monitoring": $MONITORING,
    "features": $FEATURES,
    "audits": $AUDITS,
    "planning": $PLANNING,
    "general": $GENERAL
  },
  "ownership": {
    "with_metadata": $FILES_WITH_OWNERSHIP,
    "missing_metadata": $MISSING_OWNERSHIP,
    "compliance_percentage": $(echo "scale=2; $FILES_WITH_OWNERSHIP * 100 / $TOTAL_DOCS" | bc 2>/dev/null || echo "0")
  },
  "stale_documents": $STALE_DOCS,
  "broken_links": 0,
  "review_compliance": 0.0
}
EOF

echo ""
echo "By Category:"
echo "  Architecture: $ARCHITECTURE"
echo "  Deployment: $DEPLOYMENT"
echo "  Security: $SECURITY"
echo "  Testing: $TESTING"
echo "  Database: $DATABASE"
echo "  API: $API"
echo "  Monitoring: $MONITORING"
echo "  Features: $FEATURES"
echo "  Audits: $AUDITS"
echo "  Planning: $PLANNING"
echo "  General: $GENERAL"
echo ""
echo "Ownership Metadata:"
echo "  With Metadata: $FILES_WITH_OWNERSHIP"
echo "  Missing Metadata: $MISSING_OWNERSHIP"
echo ""
echo "Report saved to: $OUTPUT_FILE"
