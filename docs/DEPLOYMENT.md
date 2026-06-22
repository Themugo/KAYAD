# Deployment Pipeline Guide

## Overview

This document describes the deployment pipeline for the KAYAD application, including CI/CD workflows, deployment procedures, and operational guidelines.

## Table of Contents

1. [Deployment Architecture](#deployment-architecture)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Environment Separation](#environment-separation)
4. [Build Process](#build-process)
5. [Migration Execution](#migration-execution)
6. [Rollback Procedures](#rollback-procedures)
7. [Secret Management](#secret-management)
8. [Preview Deployments](#preview-deployments)
9. [Semantic Versioning](#semantic-versioning)
10. [Release Checklist](#release-checklist)

## Deployment Architecture

### Current Setup

- **CI/CD Platform**: GitHub Actions
- **Production Hosting**: Render (Backend), Vercel (Frontend)
- **Containerization**: Docker (optional)
- **Database**: MongoDB Atlas
- **Cache**: Redis (optional, in-memory fallback)
- **Monitoring**: Sentry, custom metrics, OpenTelemetry

### Deployment Flow

```
Developer Push → CI Pipeline → Tests → Security Scan → Preview (PR) → Production (main)
```

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Triggers on:
- Push to `main` or `develop` branches
- Pull requests to `main`

Jobs:
- **Frontend**: Install dependencies, lint, test, build
- **Backend**: Install dependencies, lint, test with MongoDB service
- **Security Audit**: npm audit, Snyk security scan

```yaml
# Example CI workflow structure
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  frontend:
    - npm ci
    - npm run lint
    - npm test
    - npm run build

  backend:
    - npm ci
    - npm run format:check
    - npm test
    # MongoDB service for tests

  security-audit:
    - npm audit
    - Snyk scan
```

#### 2. Preview Deployment (`.github/workflows/preview.yml`)

Triggers on:
- Pull requests to `main` (opened, synchronize, reopened)

Jobs:
- **Preview Backend**: Deploy to Render preview environment
- **Preview Frontend**: Deploy to Vercel preview deployment

### CI/CD Best Practices

- All tests must pass before merge
- Lint checks enforced
- Security scans run on every commit
- Preview deployments for PRs
- Automated releases on main branch

## Environment Separation

### Environments

1. **Development** (`NODE_ENV=development`)
   - Local development
   - Hot reload with nodemon
   - Debug logging enabled
   - Mock services for external APIs

2. **Staging/Preview** (`NODE_ENV=production`)
   - Preview deployments for PRs
   - Production-like configuration
   - Separate database instance
   - Test data only

3. **Production** (`NODE_ENV=production`)
   - Live production environment
   - Optimized configuration
   - Production database
   - Full monitoring and alerting

### Environment Variables

See `backend/.env.example` for complete list. Key variables:

```bash
# Server
NODE_ENV=production
PORT=5000

# Database
MONGO_URI=mongodb+srv://...
MONGO_POOL_SIZE=10

# Security
JWT_SECRET=<generate-32-char-string>
REFRESH_TOKEN_SECRET=<generate-different-32-char-string>

# External Services
MPESA_CONSUMER_KEY=...
SENTRY_DSN=...
REDIS_URL=...
```

### Environment-Specific Configuration

- Development: Use `.env` file (gitignored)
- Preview: Render/Vercel environment variables
- Production: Render/Vercel environment variables

## Build Process

### Backend Build

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Format check
npm run format:check

# Start server
npm start
```

### Frontend Build

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

### Docker Build (Optional)

```bash
# Build image
docker build -t kayad-backend:latest ./backend

# Run container
docker run -p 5000:5000 kayad-backend:latest
```

## Migration Execution

### Database Seeding

The application uses a seed script for initial data setup:

```bash
# Run seed script
npm run seed

# Seed departments
npm run seed-depts
```

### Migration Strategy

- **No formal migrations**: The application uses Mongoose models with automatic schema updates
- **Seed data**: Initial data seeded on first deployment
- **Backup before changes**: Always backup before schema changes
- **Rollback capability**: Keep previous schema versions in code

### Migration Best Practices

1. Always backup database before schema changes
2. Test migrations in staging first
3. Use feature flags for new features
4. Keep migrations backward compatible
5. Document breaking changes

## Rollback Procedures

### Render Rollback

Render supports instant rollbacks:

1. Go to Render dashboard
2. Select the service
3. Click "Deployments"
4. Click on previous deployment
5. Click "Rollback"

### Manual Rollback

```bash
# Using git
git checkout <previous-commit-hash>
git push origin main --force

# Using PM2 (if using PM2)
pm2 revert ecosystem.config.cjs
```

### Database Rollback

```bash
# Restore from backup
node scripts/backup.js restore <backup-file>
```

### Rollback Checklist

- [ ] Identify last stable deployment
- [ ] Rollback application code
- [ ] Rollback database if needed
- [ ] Verify health checks
- [ ] Monitor for errors
- [ ] Notify team of rollback

## Secret Management

### Secret Storage

- **Development**: `.env` file (gitignored)
- **Production**: Render/Vercel environment variables
- **CI/CD**: GitHub Secrets

### GitHub Secrets Required

- `SNYK_TOKEN`: For security scanning
- `RENDER_API_KEY`: For preview deployments (optional)
- `VERCEL_TOKEN`: For preview deployments
- `VERCEL_ORG_ID`: For preview deployments
- `VERCEL_PROJECT_ID`: For preview deployments

### Secret Rotation

1. Generate new secret
2. Update in environment variables
3. Deploy application
4. Verify functionality
5. Remove old secret

### Secret Best Practices

- Never commit secrets to git
- Use strong, randomly generated secrets
- Rotate secrets regularly
- Use different secrets per environment
- Limit secret access to necessary personnel

## Preview Deployments

### Preview Environment

Preview deployments are automatically created for pull requests:

- **Backend**: `kayad-backend-preview-<pr-number>.onrender.com`
- **Frontend**: Vercel preview URL

### Preview Deployment Workflow

1. Create feature branch
2. Push changes
3. Create pull request to main
4. Preview deployment automatically created
5. Test preview environment
6. Merge PR to deploy to production

### Preview Environment Configuration

- Uses production-like configuration
- Separate database instance (if available)
- Test data only
- Limited monitoring

## Semantic Versioning

### Version Format

`MAJOR.MINOR.PATCH` (e.g., 2.0.0)

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Commit Conventions

Use conventional commits for automatic versioning:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks
- `perf:` Performance improvements
- `build:` Build system changes

### Automated Release

Releases are automated using semantic-release:

```bash
# Trigger release (on main branch)
npm run release
```

Release process:
1. Analyze commits
2. Determine version bump
3. Generate changelog
4. Create git tag
5. Publish to npm (if applicable)
6. Create GitHub release

### Release Notes

Release notes are automatically generated based on commits and included in the GitHub release.

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] Lint checks passing
- [ ] Security audit clean
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Environment variables configured
- [ ] Database backup created
- [ ] Feature flags configured (if needed)
- [ ] Monitoring configured
- [ ] Alert thresholds set

### Release

- [ ] Create release branch (if needed)
- [ ] Merge to main
- [ ] CI/CD pipeline passes
- [ ] Preview deployment tested
- [ ] Production deployment initiated
- [ ] Health checks verified
- [ ] Smoke tests passed
- [ ] Monitoring verified

### Post-Release

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check user feedback
- [ ] Verify integrations (M-Pesa, email, SMS)
- [ ] Check database performance
- [ ] Review logs for issues
- [ ] Update documentation (if needed)
- [ ] Notify team of release
- [ ] Create post-release summary

### Emergency Rollback

If issues detected post-release:

1. **Immediate Action**:
   - [ ] Identify issue severity
   - [ ] Determine rollback scope
   - [ ] Execute rollback
   - [ ] Notify stakeholders

2. **Investigation**:
   - [ ] Analyze root cause
   - [ ] Document findings
   - [ ] Create fix plan

3. **Resolution**:
   - [ ] Implement fix
   - [ ] Test thoroughly
   - [ ] Deploy fix
   - [ ] Verify resolution

## Monitoring and Alerting

### Health Checks

- `/health` - Basic health check
- `/health/detailed` - Detailed health with replica set info
- `/health/cache` - Cache statistics

### Metrics

- `/metrics` - JSON metrics
- `/prometheus` - Prometheus format metrics

### Monitoring Tools

- **Sentry**: Error tracking and performance
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **OpenTelemetry**: Distributed tracing

### Alert Thresholds

See `docs/OBSERVABILITY.md` for detailed alert thresholds.

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check CI logs
   - Verify dependencies
   - Check environment variables

2. **Deployment Failures**
   - Check Render/Vercel logs
   - Verify health checks
   - Check database connectivity

3. **Runtime Errors**
   - Check Sentry
   - Review application logs
   - Verify configuration

### Support

- Check documentation in `docs/`
- Review GitHub Issues
- Contact DevOps team

## Security Considerations

- All secrets stored in environment variables
- No secrets in git
- Regular security audits
- Dependency vulnerability scanning
- Code reviews required
- Rate limiting enabled
- Input validation enforced

## Future Enhancements

- [ ] Add integration tests to CI
- [ ] Implement canary deployments
- [ ] Add performance testing
- [ ] Implement blue-green deployments
- [ ] Add automated rollback on health check failure
- [ ] Implement database migrations framework
- [ ] Add load testing to CI
- [ ] Implement chaos engineering
