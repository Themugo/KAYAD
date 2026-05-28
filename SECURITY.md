# Security Policy

## Reporting a Vulnerability

Contact the maintainer directly at the email listed in the project's `.env.example` (`WEBHOIST_EMAIL`). Do not open public issues for security vulnerabilities.

## Scope

- JWT authentication and token rotation
- M-Pesa payment callback validation
- Escrow fund release authorization
- Bid fraud prevention
- Rate limiting on sensitive endpoints
- Input sanitization (NoSQL injection, XSS)
- File upload magic byte validation

## Best Practices

1. Keep `JWT_SECRET` and `REFRESH_TOKEN_SECRET` strong and rotated regularly
2. Enable `MPESA_SKIP_IP_CHECK=false` in production
3. Set `NODE_ENV=production` to disable stack traces in error responses
4. Configure `SENTRY_DSN` for error monitoring
5. Never commit `.env` files to version control
