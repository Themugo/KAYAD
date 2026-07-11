# Monitoring Guide — Gari Motors Marketplace

## Supabase Dashboard

Monitor database health, auth activity, and storage usage at:
`https://supabase.com/dashboard/project/leximzdduxbcgwaxyhva`

### Key Metrics
- **Database:** Query performance, connection pool, table sizes
- **Auth:** Sign-up/sign-in rates, active sessions
- **Storage:** Bucket usage, bandwidth

## Frontend Monitoring

- Browser DevTools: Network tab for API latency
- React DevTools: Component render profiling
- Lighthouse: Performance, accessibility, SEO audit

## Error Tracking

Errors are captured by the React ErrorBoundary and displayed to users with recovery options.
