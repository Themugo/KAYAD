# API Governance Documentation

## Overview

This document outlines the API governance policies, standards, and guidelines for the KAYAD platform.

## Current Implementation Status

### ✅ Implemented
- **OpenAPI 3.0 Specification**: Enhanced with comprehensive schemas
- **API Versioning**: URI-based versioning (`/api/v1/`, `/api/v2/`)
- **Validation**: Zod schemas for all request/response validation
- **Authentication**: JWT-based authentication with `protect` middleware
- **Authorization**: Role-based access control (RBAC) with `adminOnly`, `dealerOnly`
- **Rate Limiting**: Global, auth, and admin rate limiters
- **Deprecation**: Middleware for deprecation headers and warnings
- **Contract Testing**: GitHub Actions workflow for OpenAPI validation
- **Documentation**: API governance policies documented

### 📋 In Progress
- **SDK Generation**: OpenAPI spec ready for SDK generation

## API Versioning Strategy

### Versioning Approach
- **URI-based versioning**: `/api/v1/`, `/api/v2/`
- **Current version**: v1
- **Deprecation policy**: Minimum 6 months notice before deprecation
- **Sunset policy**: Deprecated versions remain available for 12 months

### Version Lifecycle
1. **Development**: New features added to latest version
2. **Stable**: Production-ready, fully documented
3. **Deprecated**: No new features, security fixes only
4. **Sunset**: No longer supported, removed from production

### Implementation
- `backend/routes/v1.js` - Current stable API
- `backend/routes/v2.js` - Future API version (placeholder)
- `backend/middleware/apiVersion.js` - Version detection middleware
- `X-API-Version` header added to all responses

## API Standards

### Authentication
- **Public endpoints**: No authentication required
- **User endpoints**: JWT bearer token required (`protect` middleware)
- **Admin endpoints**: JWT + admin role required (`adminOnly` middleware)
- **Dealer endpoints**: JWT + dealer role required (`dealerOnly` middleware)

**Implementation**: `backend/middleware/auth.js`

### Authorization
- Role-based access control (RBAC)
- Resource ownership checks
- Permission-based access for admin operations

**Roles**: user, dealer, admin, inspector

### Validation
- All inputs validated using Zod schemas
- Request body validation before processing
- Query parameter validation
- Path parameter validation

**Implementation**: 
- `backend/validation/common.schema.js` - Common schemas
- `backend/validation/auth.schema.js` - Auth schemas
- `backend/validation/car.schema.js` - Car schemas
- `backend/middleware/validate.js` - Validation middleware

### Rate Limiting
- **Global**: 500 requests/15min per IP (configurable)
- **Authenticated**: User-based rate limiting
- **Admin**: Bypass rate limiting for trusted users
- **Sensitive operations**: Stricter limits (upload, bid, create)

**Implementation**: `backend/middleware/rateLimiter.js`

**Headers**:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

### Response Format
```json
{
  "success": true|false,
  "data": {},
  "message": "string",
  "errors": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Handling
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

## OpenAPI Specification

### Documentation
- All endpoints documented with OpenAPI 3.0
- Auto-generated Swagger UI at `/api-docs` (dev) or `/api-docs` (prod with auth)
- Request/response schemas defined
- Authentication schemes documented
- Tags for endpoint categorization

**Implementation**: `backend/config/swagger.js`

### Contract Testing
- OpenAPI spec used as source of truth
- Automated contract tests in CI/CD
- Validation against spec on every PR

**Implementation**: `.github/workflows/contract-test.yml`

## SDK Generation

### Supported Languages
- JavaScript/TypeScript
- Python
- Java
- Go

### Generation Process
1. Update OpenAPI spec
2. Run SDK generation script (to be implemented)
3. Publish to package registry
4. Update documentation

### Tools
- OpenAPI Generator: https://openapi-generator.tech
- Swagger Codegen: https://github.com/swagger-api/swagger-codegen

## Deprecation Policy

### Deprecation Process
1. Add `X-API-Deprecated: true` header to deprecated endpoints
2. Add `X-API-Sunset-Date` header with sunset date
3. Add `X-API-Replacement` header with new endpoint
4. Update documentation with migration guide
5. Notify API consumers via email/announcement

### Sunset Process
1. 6 months before sunset: Deprecation notice
2. 3 months before sunset: Warning in responses
3. 1 month before sunset: Final reminder
4. Sunset date: Endpoint removed

**Implementation**: `backend/middleware/deprecation.js`

**Policy Constants**:
- NOTICE_PERIOD: 6 months
- SUNSET_PERIOD: 12 months
- WARNING_INTERVALS: [6, 3, 1] months before sunset

## Security Standards

### Headers
- `Authorization`: Bearer token for authenticated requests
- `Content-Type`: application/json
- `X-Request-ID`: Unique request identifier
- `X-API-Version`: API version being used
- `X-API-Deprecated`: Deprecation warning
- `X-API-Sunset-Date`: Sunset date
- `X-API-Replacement`: Replacement endpoint

### CORS
- Configured for production domains
- Credentials allowed for authenticated requests
- Pre-flight requests handled
- Max age: 24 hours

### Security Middleware
- Helmet for security headers
- mongoSanitize for NoSQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Body size limits (2MB)

## Monitoring & Observability

### Metrics
- Request count per endpoint
- Response time percentiles (p50, p95, p99)
- Error rate per endpoint
- Rate limit violations
- API version usage

### Logging
- Request/response logging
- Error stack traces
- Security events
- Performance metrics
- Deprecation access logs

### Alerts
- High error rate (>5%)
- Slow response time (>2s p95)
- Rate limit abuse
- Security violations
- Deprecated endpoint access

## Development Guidelines

### Adding New Endpoints
1. Define Zod schemas in `backend/validation/`
2. Add OpenAPI documentation in route file
3. Implement authentication/authorization middleware
4. Add appropriate rate limiting
5. Write unit tests
6. Update OpenAPI spec
7. Update documentation

### Modifying Existing Endpoints
1. Assess breaking changes
2. If breaking, create new version in v2
3. If non-breaking, update existing
4. Update OpenAPI spec
5. Add deprecation notice if needed
6. Update tests
7. Update documentation

### Removing Endpoints
1. Follow deprecation policy
2. Add deprecation middleware
3. Provide migration guide
4. Update documentation
5. Remove after sunset period

## API Categories

### Public APIs
- Car listings (`/api/v1/cars`)
- Car details (`/api/v1/cars/:id`)
- Market data (`/api/v1/market`)
- Contact forms (`/api/v1/contact`)

### User APIs
- Profile management (`/api/v1/users`)
- Favorites (`/api/v1/favorites`)
- Notifications (`/api/v1/notifications`)
- Chat (`/api/v1/chat`)

### Dealer APIs
- Car management (`/api/v1/dealer`)
- Analytics (`/api/v1/dealer/analytics`)
- Auction setup (`/api/v1/dealer/auction-setup`)
- Settlement (`/api/v1/dealer/settlement`)

### Admin APIs
- User management (`/api/v1/admin/users`)
- Content moderation (`/api/v1/admin/moderation`)
- Platform settings (`/api/v1/admin/settings`)
- Analytics (`/api/v1/admin`)

## Compliance

### Data Privacy
- GDPR compliance
- Data minimization
- User consent
- Right to deletion

### Security
- OWASP guidelines
- Input sanitization
- NoSQL injection prevention
- XSS protection
- CSRF protection

### Performance
- Response time SLA: <500ms p95
- Availability SLA: 99.9%
- Rate limiting enforced
- Caching implemented

## Files Created/Modified

### Created Files:
- `API_GOVERNANCE.md` - This governance document
- `backend/validation/common.schema.js` - Common Zod schemas
- `backend/middleware/deprecation.js` - Deprecation middleware
- `backend/middleware/apiVersion.js` - API version detection
- `backend/routes/v2.js` - API v2 placeholder
- `.github/workflows/contract-test.yml` - Contract testing workflow

### Modified Files:
- `backend/config/swagger.js` - Enhanced OpenAPI spec
- `backend/server.js` - Added versioning and v2 routes

## References

- [OpenAPI Specification](https://swagger.io/specification/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [REST API Best Practices](https://restfulapi.net/)
- [Zod Validation](https://zod.dev/)
