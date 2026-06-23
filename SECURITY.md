---
title: SECURITY
owner: @security-lead
team: security
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [security]
---
# Security Policy

## Reporting a Vulnerability

Contact the maintainer directly at the email listed in `.env.example` (`WEBHOIST_EMAIL`). Do not open public issues for security vulnerabilities.

## Scope

- JWT authentication and token rotation
- M-Pesa payment callback validation
- Escrow fund release authorization
- Bid fraud prevention
- Rate limiting on sensitive endpoints
- Input sanitization (NoSQL injection, XSS)
- File upload magic byte validation
- Socket.IO event authentication and rate limiting
- Payment amount validation (no negative values)
- CORS origin whitelisting
- Helmet security headers (CSP, HSTS, X-Frame-Options)
- MongoDB injection protection via mongoSanitize
- CSRF protection on token refresh

## Best Practices

1. Keep `JWT_SECRET` and `REFRESH_TOKEN_SECRET` strong (64+ random hex chars) and rotated regularly

```bash
# Generate secure secrets
openssl rand -hex 32
```

2. Enable `MPESA_SKIP_IP_CHECK=false` in production — never skip IP checks on live M-Pesa callbacks

```env
# backend/.env
MPESA_SKIP_IP_CHECK=false
```

3. Set `NODE_ENV=production` to disable stack traces in error responses

```env
NODE_ENV=production
```

4. Configure `SENTRY_DSN` for error monitoring in production

```env
SENTRY_DSN=https://your-dsn@sentry.io/project
```

5. Never commit `.env` files to version control

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
```

6. Run `npm run audit` regularly to check for dependency vulnerabilities

```bash
npm audit
npm audit fix
```

7. Use `REQUIRE_EMAIL_VERIFICATION=true` once SMTP is configured

```env
REQUIRE_EMAIL_VERIFICATION=true
```

8. Keep admin/staff accounts limited; prefer role-based permissions over direct admin access
9. Always use HTTPS in production — the CSP and HSTS configs assume HTTPS

## Security Architecture

| Layer | Protection |
|-------|-----------|
| Network | UFW firewall (22, 80, 443 only), Cloudflare DDoS protection |
| Transport | TLS 1.2/1.3 via Let's Encrypt, HSTS preload |
| Application | Helmet, CORS whitelist, CSRF tokens, rate limiting (8 tiers) |
| Auth | JWT with token version rotation, refresh tokens, bcrypt(12) |
| API | Zod validation, mongoSanitize, XSS sanitization, pagination caps |
| Payments | M-Pesa IP whitelist + callback payload validation, negative-amount guards |
| Storage | Magic-byte upload validation, extension whitelist, non-root Docker user |
