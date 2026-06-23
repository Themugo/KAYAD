---
title: GITHUB_SECRETS_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# GitHub Secrets Configuration Guide

This guide explains how to configure the required GitHub Secrets for the KAYAD deployment pipeline.

## Required GitHub Secrets

### CI/CD Secrets

#### GITHUB_TOKEN
- **Description**: Automatically provided by GitHub Actions
- **Required**: Yes (automatic)
- **Usage**: Used by semantic-release to create releases and tags
- **Configuration**: No manual configuration needed

### Security Scanning Secrets

#### SNYK_TOKEN
- **Description**: Snyk API token for security scanning
- **Required**: Optional (recommended)
- **Usage**: Used by Snyk action to scan for vulnerabilities
- **How to get**:
  1. Sign up at [https://snyk.io](https://snyk.io)
  2. Go to Account Settings → API Token
  3. Generate a new token
  4. Copy the token

**Configuration Steps:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SNYK_TOKEN`
4. Value: Paste your Snyk token
5. Click "Add secret"

### Preview Deployment Secrets

#### RENDER_API_KEY
- **Description**: Render API key for creating preview deployments
- **Required**: Optional (for preview deployments)
- **Usage**: Used by preview workflow to deploy to Render
- **How to get**:
  1. Log in to [Render](https://render.com)
  2. Go to Account Settings → API Keys
  3. Generate a new API key
  4. Copy the key

**Configuration Steps:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `RENDER_API_KEY`
4. Value: Paste your Render API key
5. Click "Add secret"

#### VERCEL_TOKEN
- **Description**: Vercel authentication token for preview deployments
- **Required**: Optional (for preview deployments)
- **Usage**: Used by preview workflow to deploy to Vercel
- **How to get**:
  1. Log in to [Vercel](https://vercel.com)
  2. Go to Settings → Tokens
  3. Create a new token
  4. Copy the token

**Configuration Steps:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `VERCEL_TOKEN`
4. Value: Paste your Vercel token
5. Click "Add secret"

#### VERCEL_ORG_ID
- **Description**: Vercel organization ID
- **Required**: Optional (for preview deployments)
- **Usage**: Used by preview workflow to identify Vercel organization
- **How to get**:
  1. Log in to [Vercel](https://vercel.com)
  2. Go to Settings → General
  3. Copy the Organization ID

**Configuration Steps:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `VERCEL_ORG_ID`
4. Value: Paste your Vercel organization ID
5. Click "Add secret"

#### VERCEL_PROJECT_ID
- **Description**: Vercel project ID
- **Required**: Optional (for preview deployments)
- **Usage**: Used by preview workflow to identify Vercel project
- **How to get**:
  1. Log in to [Vercel](https://vercel.com)
  2. Go to project settings
  3. Copy the Project ID

**Configuration Steps:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `VERCEL_PROJECT_ID`
4. Value: Paste your Vercel project ID
5. Click "Add secret"

## Environment-Specific Secrets

### Production Secrets (Render)

These secrets should be configured directly in Render, not in GitHub Secrets:

- `MONGO_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `SENTRY_DSN`
- `REDIS_URL`
- `SENDGRID_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

See `backend/.env.example` for the complete list.

## Secret Management Best Practices

### Security Guidelines

1. **Never commit secrets to git**
   - All secrets should be in environment variables or secret managers
   - Use `.env.example` as a template (no actual values)

2. **Use strong, randomly generated secrets**
   - Use password managers or secret generators
   - Minimum 32 characters for JWT secrets
   - Use different secrets per environment

3. **Rotate secrets regularly**
   - Set a schedule for secret rotation
   - Update secrets in all environments
   - Test after rotation

4. **Limit secret access**
   - Only give access to team members who need it
   - Use environment-specific secrets
   - Audit secret access logs

5. **Use secret scanning**
   - Enable GitHub secret scanning
   - Use Snyk to detect leaked secrets
   - Regularly audit code for hardcoded secrets

### Secret Rotation Process

1. Generate new secret
2. Update in environment variables (staging first)
3. Deploy to staging and test
4. Update in production environment variables
5. Deploy to production
6. Verify functionality
7. Remove old secret after verification period

### Secret Storage Options

**For Development:**
- `.env` file (gitignored)
- Local environment variables

**For Staging/Preview:**
- Render environment variables
- Vercel environment variables
- GitHub Secrets (for CI/CD only)

**For Production:**
- Render environment variables
- Vercel environment variables
- Secret management services (AWS Secrets Manager, HashiCorp Vault)

## Troubleshooting

### Secret Not Found Error

**Problem**: Workflow fails with "Secret not found" error

**Solution**:
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is configured in correct repository
3. Verify workflow has permissions to access secrets
4. Check secret is not at organization level if needed

### Invalid Token Error

**Problem**: Workflow fails with "Invalid token" error

**Solution**:
1. Verify token is correct
2. Check token hasn't expired
3. Verify token has required permissions
4. Regenerate token if needed

### Preview Deployment Fails

**Problem**: Preview deployment workflow fails

**Solution**:
1. Verify RENDER_API_KEY or VERCEL_TOKEN is configured
2. Check API key has required permissions
3. Verify project IDs are correct
4. Check service/project exists in Render/Vercel

## Security Checklist

- [ ] No secrets committed to git
- [ ] GitHub secret scanning enabled
- [ ] Snyk token configured
- [ ] Secrets are strong and randomly generated
- [ ] Different secrets per environment
- [ ] Secret rotation schedule in place
- [ ] Secret access limited to necessary personnel
- [ ] Secret audit logs reviewed regularly
- [ ] `.env.example` contains no actual values
- [ ] `.env` in `.gitignore`

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Snyk Documentation](https://docs.snyk.io/)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [OWASP Secret Scanning](https://owasp.org/www-community/Secret_Scanning)
