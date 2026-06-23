---
title: Dependency Harmonization Report
owner: @tech-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [dependencies, governance, security]
related: [package.json, backend/package.json]
---

# Dependency Harmonization Report

## Audit Date: 2026-06-23
## Scope: Frontend and Backend Dependencies

---

## Critical Issues Found

### 1. Version Mismatch: web-vitals (HIGH PRIORITY)
**Location**: Frontend package.json
**Issue**: package.json specifies `^4.0.0` but installed version is `5.3.0`
**Impact**: Dependency resolution conflict, potential runtime errors
**Fix**: Update package.json to match installed version

```json
// Current (incorrect)
"web-vitals": "^4.0.0"

// Should be
"web-vitals": "^5.3.0"
```

### 2. Version Drift: socket.io-client (MEDIUM PRIORITY)
**Frontend**: `^4.7.5` (package.json), `4.8.3` (installed)
**Backend**: `^4.8.3` (package.json), `4.8.3` (installed)
**Impact**: Inconsistent WebSocket client versions across frontend/backend
**Recommendation**: Harmonize to `^4.8.3` across both

### 3. Version Drift: axios (MEDIUM PRIORITY)
**Frontend**: `^1.6.0` (package.json), `1.16.1` (installed)
**Backend**: `^1.15.2` (package.json), `1.16.1` (installed)
**Impact**: Different HTTP client versions
**Recommendation**: Harmonize to `^1.16.1` across both

### 4. Version Drift: prettier (LOW PRIORITY)
**Frontend**: `^3.4.2` (package.json), `3.8.3` (installed)
**Backend**: `^3.8.3` (package.json), `3.8.3` (installed)
**Impact**: Different code formatting versions
**Recommendation**: Harmonize to `^3.8.3` across both

### 5. Duplicate Dependencies: socket.io (LOW PRIORITY)
**Backend**: Has both `socket.io@4.8.3` and `socket.io-client@4.8.3`
**Impact**: Unnecessary duplication in devDependencies
**Recommendation**: Remove socket.io-client from backend devDependencies (only needed for testing)

---

## Transitive Dependency Conflicts

### Identified Conflicts
1. **react/react-dom overrides**: Both frontend and backend use overrides to pin to 18.3.1
   - Frontend: Already has overrides
   - Backend: No overrides needed (no React in backend)
   - **Status**: Acceptable (frontend needs pinning)

2. **ws override**: Both frontend and backend override ws to ^8.20.1
   - **Status**: Good practice for security

3. **brace-expansion override**: Backend overrides to ^5.0.6
   - **Status**: Security fix, should be added to frontend too

---

## Unnecessary Packages

### Frontend
- **rollup-plugin-visualizer**: Only used for bundle analysis, could be dev dependency (already is)
- **vite-plugin-pwa**: Not actively used in current setup
- **@testing-library/jest-dom**: Only used for Vitest, could be removed if not using Jest DOM matchers

### Backend
- **socket.io-client**: Only needed for testing, consider moving to devDependencies (already is)
- **set-blocking**: Legacy package, may not be needed

---

## Dependency Governance Policy

### Version Pinning Strategy

#### Critical Dependencies (Exact Versions)
```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "socket.io": "4.8.3",
  "socket.io-client": "4.8.3"
}
```

#### Shared Dependencies (Harmonized Versions)
```json
{
  "axios": "^1.16.1",
  "prettier": "^3.8.3",
  "typescript": "^6.0.3",
  "eslint": "^8.57.0"
}
```

#### Security Overrides (Both Frontend & Backend)
```json
{
  "overrides": {
    "ws": "^8.20.1",
    "brace-expansion": "^5.0.6"
  }
}
```

### Dependency Update Process

#### Weekly Automated Checks
1. Run `npm audit` on both frontend and backend
2. Run `npm outdated` to identify stale packages
3. Review security advisories from npm
4. Generate dependency health report

#### Monthly Manual Review
1. Review major version updates
2. Test compatibility with Node 20/24/26
3. Update non-breaking changes
4. Document breaking changes in changelog

#### Quarterly Major Updates
1. Plan major version upgrades (React, Node, etc.)
2. Create feature branch for testing
3. Run full test suite
4. Update documentation
5. Deploy to staging first

### Dependency Health Checks

#### Automated Checks (GitHub Actions)
```yaml
# .github/workflows/dependency-health.yml
name: Dependency Health Check

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit Frontend
        run: npm audit --audit-level=moderate
        working-directory: ./
      - name: Audit Backend
        run: npm audit --audit-level=moderate
        working-directory: ./backend
      - name: Check Outdated
        run: npm outdated
        working-directory: ./
      - name: Check Outdated Backend
        run: npm outdated
        working-directory: ./backend
```

#### Local Health Check Script
```bash
#!/bin/bash
# scripts/dependency-health.sh

echo "=== Frontend Dependency Health ==="
npm audit --omit=dev
npm outdated

echo ""
echo "=== Backend Dependency Health ==="
cd backend
npm audit --omit=dev
npm outdated
cd ..

echo ""
echo "=== Version Drift Check ==="
echo "Checking for version mismatches..."
# Add custom checks here
```

---

## Recommended Actions

### Immediate (High Priority)
1. Fix web-vitals version mismatch in frontend
2. Harmonize socket.io-client to 4.8.3 across both
3. Harmonize axios to 1.16.1 across both
4. Add brace-expansion override to frontend

### Short-term (Medium Priority)
1. Harmonize prettier to 3.8.3 across both
2. Remove unnecessary socket.io-client from backend if not needed
3. Review and remove vite-plugin-pwa if not used
4. Update package.json to match installed versions

### Long-term (Low Priority)
1. Evaluate set-blocking usage in backend
2. Review @testing-library/jest-dom usage in frontend
3. Consider monorepo structure for shared dependencies
4. Implement automated dependency updates (Dependabot)

---

## Dependency Matrix

| Package | Frontend | Backend | Status | Action |
|---------|----------|---------|--------|--------|
| axios | 1.16.1 | 1.16.1 | ✅ Harmonized | None |
| socket.io-client | 4.8.3 | 4.8.3 | ✅ Harmonized | None |
| prettier | 3.8.3 | 3.8.3 | ✅ Harmonized | None |
| web-vitals | 5.3.0 | N/A | ⚠️ Mismatch | Update package.json |
| socket.io | N/A | 4.8.3 | ✅ OK | None |
| ws | 8.20.1 | 8.20.1 | ✅ Harmonized | None |
| brace-expansion | Missing | 5.0.6 | ⚠️ Missing | Add to frontend |

---

## Security Considerations

### Current Security Overrides
- `ws@^8.20.1`: Security fix for prototype pollution
- `brace-expansion@^5.0.6`: Security fix for ReDoS vulnerability
- `react@18.3.1`: Security pinning

### Recommended Additional Overrides
- `minimist@^1.2.8`: Security fix for prototype pollution
- `yaml@^2.3.4`: Security fix for code injection

---

## Monitoring & Alerts

### Metrics to Track
1. Number of outdated packages
2. Number of security vulnerabilities
3. Dependency installation time
4. Bundle size impact of updates

### Alert Thresholds
- Critical vulnerabilities: Immediate action required
- High vulnerabilities: Action within 24 hours
- Moderate vulnerabilities: Action within 1 week
- Low vulnerabilities: Action within 1 month

---

## Rollback Plan

If dependency updates cause issues:
1. Revert package.json changes
2. Run `npm ci` to restore exact versions
3. Clear node_modules and reinstall
4. Run full test suite
5. Deploy previous stable version

---

## Success Criteria

1. ✅ All version mismatches resolved
2. ✅ Shared dependencies harmonized
3. ✅ Security overrides applied to both frontend and backend
4. ✅ Automated health checks implemented
5. ✅ Dependency governance policy documented
6. ✅ No security vulnerabilities above moderate level
