#!/bin/bash
# Dependency Health Check Script
# Run this script to check for dependency issues across frontend and backend

set -e

echo "========================================="
echo "   KAYAD Dependency Health Check"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Frontend Health Check
echo "📦 Frontend Dependency Health"
echo "========================================="
cd "$(dirname "$0")"

echo ""
echo "Running npm audit..."
if npm audit --omit=dev; then
    echo -e "${GREEN}✓ No critical vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠ Some vulnerabilities found${NC}"
fi

echo ""
echo "Checking outdated packages..."
npm outdated || echo "No outdated packages found"

echo ""
echo "Checking package.json vs installed versions..."
npm list --depth=0 2>&1 | grep -i "invalid" && echo -e "${RED}✗ Version mismatch detected${NC}" || echo -e "${GREEN}✓ No version mismatches${NC}"

# Backend Health Check
echo ""
echo "📦 Backend Dependency Health"
echo "========================================="
cd backend

echo ""
echo "Running npm audit..."
if npm audit --omit=dev; then
    echo -e "${GREEN}✓ No critical vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠ Some vulnerabilities found${NC}"
fi

echo ""
echo "Checking outdated packages..."
npm outdated || echo "No outdated packages found"

echo ""
echo "Checking package.json vs installed versions..."
npm list --depth=0 2>&1 | grep -i "invalid" && echo -e "${RED}✗ Version mismatch detected${NC}" || echo -e "${GREEN}✓ No version mismatches${NC}"

# Version Drift Check
echo ""
echo "🔍 Version Drift Analysis"
echo "========================================="
cd ..

# Check shared dependencies
echo ""
echo "Shared Dependencies Check:"
echo "---------------------------"

# Check axios
FRONTEND_AXIOS=$(grep '"axios"' package.json | head -1 | awk -F'"' '{print $4}')
BACKEND_AXIOS=$(grep '"axios"' backend/package.json | head -1 | awk -F'"' '{print $4}')
if [ "$FRONTEND_AXIOS" = "$BACKEND_AXIOS" ]; then
    echo -e "${GREEN}✓ axios: $FRONTEND_AXIOS (harmonized)${NC}"
else
    echo -e "${YELLOW}⚠ axios: frontend=$FRONTEND_AXIOS, backend=$BACKEND_AXIOS (drift)${NC}"
fi

# Check socket.io-client
FRONTEND_SOCKET=$(grep '"socket.io-client"' package.json | head -1 | awk -F'"' '{print $4}')
BACKEND_SOCKET=$(grep '"socket.io-client"' backend/package.json | head -1 | awk -F'"' '{print $4}')
if [ "$FRONTEND_SOCKET" = "$BACKEND_SOCKET" ]; then
    echo -e "${GREEN}✓ socket.io-client: $FRONTEND_SOCKET (harmonized)${NC}"
else
    echo -e "${YELLOW}⚠ socket.io-client: frontend=$FRONTEND_SOCKET, backend=$BACKEND_SOCKET (drift)${NC}"
fi

# Check prettier
FRONTEND_PRETTIER=$(grep '"prettier"' package.json | head -1 | awk -F'"' '{print $4}')
BACKEND_PRETTIER=$(grep '"prettier"' backend/package.json | head -1 | awk -F'"' '{print $4}')
if [ "$FRONTEND_PRETTIER" = "$BACKEND_PRETTIER" ]; then
    echo -e "${GREEN}✓ prettier: $FRONTEND_PRETTIER (harmonized)${NC}"
else
    echo -e "${YELLOW}⚠ prettier: frontend=$FRONTEND_PRETTIER, backend=$BACKEND_PRETTIER (drift)${NC}"
fi

echo ""
echo "========================================="
echo "   Health Check Complete"
echo "========================================="
