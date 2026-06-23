# 0001: Authentication Strategy

## Status
Accepted

## Context
The KAYAD platform requires secure authentication for multiple user types (buyers, dealers, admins) with different access levels. We need to balance security, user experience, and scalability while supporting:
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Session management for sensitive operations
- Multi-factor authentication (MFA) for admin accounts
- OAuth integration for social login (future)

## Decision
We will implement JWT-based authentication with the following architecture:

### Authentication Flow
1. **User Registration/Login**: Users authenticate with email/password
2. **Token Generation**: Server generates JWT access tokens (15min expiry) and refresh tokens (7 days expiry)
3. **Token Storage**: Access tokens stored in memory, refresh tokens in httpOnly cookies
4. **Token Validation**: Middleware validates JWT on protected routes
5. **Token Refresh**: Automatic refresh using refresh token before expiry

### Technical Implementation
- **JWT Library**: jsonwebtoken
- **Token Secret**: Environment variable (JWT_SECRET)
- **Algorithm**: HS256 (can be upgraded to RS256 for better security)
- **Token Structure**:
  ```javascript
  {
    sub: userId,
    role: userRole,
    iat: issuedAt,
    exp: expiresAt,
    jti: tokenId
  }
  ```

### Role-Based Access Control
- **Roles**: user, dealer, admin, inspector
- **Middleware**: protect, adminOnly, dealerOnly, supportOnly, salesOnly
- **Authorization**: Role checks on protected routes

### Security Measures
- Password hashing with bcrypt (10 rounds)
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- Secure cookie settings (httpOnly, secure, sameSite)
- Token blacklisting for logout (optional)

## Consequences

### Positive
- Stateless authentication scales horizontally
- No server-side session storage required
- Easy to integrate with microservices
- Standard JWT libraries available
- Mobile-friendly (works with mobile apps)

### Negative
- Token revocation requires additional infrastructure (blacklist)
- JWT payload size increases with claims
- Refresh token management adds complexity
- Cannot invalidate individual tokens without blacklist

## Alternatives Considered

### Session-Based Authentication
- **Rejected**: Requires server-side session storage, doesn't scale horizontally as easily
- **Reason**: JWT provides better scalability for our distributed architecture

### OAuth 2.0 / OpenID Connect
- **Rejected**: Overkill for current requirements
- **Reason**: Can be added later for social login integration

### API Keys
- **Rejected**: Not suitable for user authentication
- **Reason**: API keys are for service-to-service authentication, not user authentication

## Implementation Notes
- Refresh tokens stored in MongoDB for revocation support
- Token rotation on refresh to prevent replay attacks
- MFA implementation using TOTP for admin accounts (future)
- OAuth integration planned for Google, Facebook login (future)

## References
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Related ADRs
- 0002: Payment Architecture
- 0006: Infrastructure Architecture
