---
title: STRUCTURED_LOGGING_MIGRATION_PLAN
owner: @product-lead
team: product
last-reviewed: 2026-06-23
review-frequency: as-needed
status: active
tags: [features]
---
# Structured Logging Migration Plan (Winston → Pino)

**Phase:** Phase 6 - DevOps Engineering  
**Engineer:** DevOps Engineer  
**Date:** June 14, 2026  
**Scope:** Migrate from Winston to Pino for improved observability

---

## 📋 AUDIT FINDINGS

### Current Logging Infrastructure

**Existing Logger:** `backend/utils/logger.js`
- Uses Winston logging library
- Has log rotation via `winston-daily-rotate-file`
- Environment-specific logging (dev: console, production: file rotation)
- Structured logging with JSON format
- Error tracking integration via Sentry (`backend/utils/sentry.js`)

**Current Dependencies:**
- `winston: ^3.19.0`
- `winston-daily-rotate-file: ^5.0.0`

**Console Usage Audit:**
- **No console.log statements found** in backend codebase
- Codebase already uses structured logging via Winston
- All logging goes through `backend/utils/logger.js`

### Gap Analysis

**Current State:**
- ✅ Structured logging (Winston)
- ✅ Log rotation (winston-daily-rotate-file)
- ✅ Environment-specific configs
- ✅ Error tracking (Sentry)
- ❌ Using Winston instead of Pino (requested by user)

**Required Changes:**
- Migrate from Winston to Pino
- Preserve all existing functionality
- Maintain log rotation
- Keep environment-specific configs
- Retain Sentry integration
- No application behavior changes

---

## 🎯 REQUIREMENTS

### Migration Requirements

**Replace Winston with Pino:**
- Use Pino for structured logging
- Maintain same API (logInfo, logWarn, logError, logDebug)
- Preserve log rotation functionality
- Keep environment-specific configurations
- Retain Sentry error tracking integration
- No breaking changes to application code

**Infrastructure:**
- Create `backend/infrastructure/logging` directory structure
- Separate logger configuration from implementation
- Environment-specific config files
- Centralized logger service

**Observability:**
- Structured JSON logging
- Request ID tracking
- Error context capture
- Performance metrics logging
- Log aggregation ready format

---

## 📐 ARCHITECTURE DESIGN

### New Directory Structure

```
backend/infrastructure/logging/
├── index.js                    # Main logger export
├── pino.config.js              # Pino configuration
├── transports.js               # Log transports (file, console)
├── serializers.js              # Custom serializers for Pino
├── child-logger.js             # Child logger factory
└── sentry-integration.js       # Sentry integration for Pino
```

### Pino Configuration

**Development:**
- Pretty print to console
- Colorized output
- Debug level enabled
- No file logging

**Production:**
- JSON format to files
- Log rotation (pino-rotate)
- Error level default
- Separate error log file
- Structured format for log aggregation

**Staging:**
- JSON format to console
- Info level enabled
- No file logging

### Logger Service API

**Preserve Existing API:**
```javascript
export const logInfo = (message, meta = {}) => { ... }
export const logWarn = (message, meta = {}) => { ... }
export const logError = (message, error = null, meta = {}) => { ... }
export const logDebug = (message, meta = {}) => { ... }
export const logRequest = (req) => { ... }
export const logResponse = (req, res, duration) => { ... }
export const generateRequestId = () => { ... }
```

**New Features:**
- Child logger with context
- Performance timing
- Request-scoped logging
- Structured error serialization

---

## 📁 FILE-BY-FILE IMPLEMENTATION PLAN

### Phase 1: Dependencies

**File:** `backend/package.json`
- Add: `pino: ^9.0.0`
- Add: `pino-pretty: ^11.0.0` (dev)
- Add: `pino-rotate: ^5.0.0`
- Remove: `winston: ^3.19.0`
- Remove: `winston-daily-rotate-file: ^5.0.0`

### Phase 2: Infrastructure Setup

**File:** `backend/infrastructure/logging/pino.config.js`
- Create Pino base configuration
- Environment-specific settings
- Log levels
- Timestamp format

**File:** `backend/infrastructure/logging/transports.js`
- Console transport (dev)
- File transport (production)
- Error file transport
- Log rotation configuration

**File:** `backend/infrastructure/logging/serializers.js`
- Error serializer
- Request serializer
- Response serializer
- Custom object serializers

**File:** `backend/infrastructure/logging/sentry-integration.js`
- Pino → Sentry bridge
- Error context capture
- Performance monitoring

**File:** `backend/infrastructure/logging/child-logger.js`
- Child logger factory
- Context injection
- Request-scoped logging

**File:** `backend/infrastructure/logging/index.js`
- Main logger export
- Public API (logInfo, logWarn, logError, logDebug)
- Request/response logging
- Request ID generation

### Phase 3: Core Logger Migration

**File:** `backend/utils/logger.js`
- Replace Winston with Pino
- Import from `infrastructure/logging`
- Preserve exact same API
- Maintain backward compatibility

### Phase 4: Middleware Migration

**File:** `backend/middleware/logger.js`
- Update to use Pino logger
- Maintain request logging
- Preserve response logging

**File:** `backend/utils/securityLogger.js`
- Update to use Pino logger
- Preserve security event logging
- Maintain audit trail

### Phase 5: Sentry Integration

**File:** `backend/utils/sentry.js`
- Update to work with Pino
- Maintain error tracking
- Preserve existing functionality

### Phase 6: Cleanup

**Files to Remove:**
- None (keep for rollback if needed)

**Dependencies to Remove:**
- winston
- winston-daily-rotate-file

---

## 🔄 MIGRATION STRATEGY

### Step 1: Install Dependencies
```bash
cd backend
npm install pino pino-rotate
npm install --save-dev pino-pretty
npm uninstall winston winston-daily-rotate-file
```

### Step 2: Create Infrastructure
- Create `backend/infrastructure/logging/` directory
- Implement Pino configuration
- Implement transports
- Implement serializers
- Implement Sentry integration
- Implement child logger
- Create main export

### Step 3: Update Core Logger
- Modify `backend/utils/logger.js`
- Import from new infrastructure
- Test API compatibility
- Verify logging output

### Step 4: Update Middleware
- Modify `backend/middleware/logger.js`
- Modify `backend/utils/securityLogger.js`
- Test request logging
- Test security logging

### Step 5: Update Sentry Integration
- Modify `backend/utils/sentry.js`
- Test error tracking
- Verify error context

### Step 6: Testing
- Test development logging (pretty print)
- Test production logging (JSON + rotation)
- Test error logging
- Test Sentry integration
- Verify no application behavior changes

### Step 7: Deployment
- Deploy to staging
- Monitor logs
- Verify log aggregation
- Deploy to production

---

## 🔒 BACKWARD COMPATIBILITY

### API Preservation

**Before (Winston):**
```javascript
import { logInfo, logWarn, logError, logDebug } from "../utils/logger.js";
logInfo("Message", { key: "value" });
logError("Error", error, { context: "data" });
```

**After (Pino):**
```javascript
import { logInfo, logWarn, logError, logDebug } from "../utils/logger.js";
logInfo("Message", { key: "value" });
logError("Error", error, { context: "data" });
```

**No code changes required** in application files using the logger.

---

## 📊 SUCCESS METRICS

1. **API Compatibility:** 100% - No breaking changes to logger API
2. **Log Output:** Structured JSON in production, pretty print in dev
3. **Log Rotation:** Automatic rotation of log files
4. **Error Tracking:** Sentry integration maintained
5. **Performance:** No performance degradation
6. **Observability:** Improved log structure for aggregation

---

## ⚠️ RISKS & MITIGATIONS

### Risk: Breaking Changes
**Mitigation:** 
- Preserve exact same API
- Comprehensive testing before deployment
- Gradual rollout (staging → production)

### Risk: Log Loss During Migration
**Mitigation:** 
- Deploy during low-traffic period
- Monitor logs immediately after deployment
- Keep Winston code for rollback if needed

### Risk: Performance Impact
**Mitigation:** 
- Pino is faster than Winston (expected improvement)
- Benchmark before/after
- Monitor application performance

### Risk: Sentry Integration Issues
**Mitigation:** 
- Test Sentry integration thoroughly
- Verify error context capture
- Monitor error tracking after deployment

---

## 📝 NEXT STEPS

1. ✅ Audit complete
2. ⏳ Generate implementation plan (this document)
3. ⏳ Install Pino dependencies
4. ⏳ Create infrastructure/logging directory
5. ⏳ Implement Pino configuration
6. ⏳ Implement log rotation
7. ⏳ Implement Sentry integration
8. ⏳ Update core logger
9. ⏳ Update middleware
10. ⏳ Test implementation
11. ⏳ Deploy to staging
12. ⏳ Deploy to production
