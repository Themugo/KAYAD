---
title: SNYK_SETUP_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Snyk Integration Setup Guide

This guide explains how to set up Snyk for enhanced security scanning in the KAYAD deployment pipeline.

## Overview

Snyk is a security platform that helps find and fix vulnerabilities in dependencies, code, and containers. Integration with GitHub Actions provides automated security scanning on every commit.

## Prerequisites

- Snyk account (free tier available)
- GitHub repository access
- GitHub Actions configured

## Setup Steps

### 1. Create Snyk Account

1. Go to [https://snyk.io](https://snyk.io)
2. Sign up for a free account
3. Verify your email address
4. Complete the onboarding process

### 2. Generate Snyk Token

1. Log in to Snyk
2. Click on your profile icon → Account Settings
3. Navigate to "API Token" section
4. Click "Generate Token"
5. Copy the generated token

### 3. Configure GitHub Secret

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SNYK_TOKEN`
5. Value: Paste your Snyk token
6. Click "Add secret"

### 4. Verify CI/CD Integration

The Snyk integration is already configured in `.github/workflows/ci.yml`:

```yaml
- name: Run Snyk security scan
  uses: snyk/actions/node@master
  continue-on-error: true
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
    working-directory: ./backend
```

### 5. Test the Integration

1. Create a new branch
2. Make a small change
3. Push the branch
4. Create a pull request
5. Check the CI/CD workflow results
6. Verify Snyk scan runs and reports vulnerabilities

## Snyk Configuration Options

### Severity Thresholds

The current configuration uses `--severity-threshold=high`, which means:
- Critical vulnerabilities: Always fail
- High vulnerabilities: Always fail
- Medium vulnerabilities: Continue (warning)
- Low vulnerabilities: Continue (warning)

To change the threshold, modify the `args` in the workflow:

```yaml
args: --severity-threshold=medium  # Fail on medium and above
args: --severity-threshold=critical  # Fail only on critical
```

### Snyk Monitor

To continuously monitor your project for new vulnerabilities:

1. Go to Snyk dashboard
2. Click "Add project"
3. Select GitHub integration
4. Select the KAYAD repository
5. Configure monitoring settings
6. Click "Add project"

### Snyk Code (SAST)

To enable Snyk Code for static application security testing:

1. Go to Snyk dashboard
2. Navigate to "Code" tab
3. Connect GitHub repository
4. Enable Snyk Code
5. Configure rules and policies

### Snyk Container

To scan Docker images:

1. Add Snyk container scan to CI/CD:

```yaml
- name: Build Docker image
  run: docker build -t kayad-backend:latest ./backend

- name: Scan Docker image with Snyk
  uses: snyk/actions/docker@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    image: kayad-backend:latest
    args: --severity-threshold=high
```

## Snyk Dashboard

### Project Overview

Once integrated, you'll see:
- Vulnerability count by severity
- License compliance issues
- Dependency tree
- Fix recommendations

### Vulnerability Details

For each vulnerability, Snyk provides:
- CVSS score
- Affected versions
- Available patches
- Remediation advice
- Related CVEs

### Monitoring

Snyk continuously monitors for:
- New vulnerabilities in dependencies
- License compliance issues
- Security advisories
- Automated PRs for fixes (if enabled)

## Best Practices

### Dependency Management

1. **Regular Updates**
   - Update dependencies regularly
   - Test updates in staging first
   - Use semantic versioning

2. **Vulnerability Remediation**
   - Prioritize critical and high vulnerabilities
   - Review fix recommendations
   - Test fixes thoroughly
   - Document remediation steps

3. **License Compliance**
   - Review license requirements
   - Ensure compliance with policies
   - Document license decisions

### Security Policies

1. **Set Severity Thresholds**
   - Critical: Always fail
   - High: Always fail
   - Medium: Warning (or fail based on policy)
   - Low: Informational

2. **Automated Fixes**
   - Enable automated PRs for minor updates
   - Manual review for major updates
   - Test all automated fixes

3. **Monitoring Frequency**
   - Daily vulnerability scans
   - Weekly dependency updates
   - Monthly security reviews

### Team Collaboration

1. **Security Notifications**
   - Configure Slack/email alerts
   - Set up escalation procedures
   - Define response times

2. **Documentation**
   - Document security decisions
   - Track remediation efforts
   - Share security knowledge

## Troubleshooting

### Snyk Token Not Found

**Problem**: Workflow fails with "SNYK_TOKEN not found"

**Solution**:
1. Verify secret is configured in GitHub
2. Check secret name matches exactly
3. Verify workflow has permissions
4. Regenerate token if needed

### Scan Fails

**Problem**: Snyk scan fails unexpectedly

**Solution**:
1. Check Snyk service status
2. Verify token is valid
3. Review scan logs for errors
4. Try running scan locally

### False Positives

**Problem**: Snyk reports false positives

**Solution**:
1. Review vulnerability details
2. Check if code uses vulnerable path
3. Mark as ignore if confirmed false positive
4. Document reason for ignoring

### Slow Scans

**Problem**: Snyk scans take too long

**Solution**:
1. Use Snyk monitor for continuous scanning
2. Limit scan to production dependencies
3. Cache dependencies between scans
4. Use severity thresholds to reduce noise

## Advanced Configuration

### Custom Snyk Policy

Create `.snyk` file in project root:

```yaml
# .snyk
language: nodejs
# Exclude certain dependencies
exclude:
  - node_modules/test-*
# Custom severity thresholds
severity-threshold: high
# License policies
license-policy:
  - key: GPL-2.0
    severity: high
    reason: "GPL license not allowed"
```

### Snyk CLI

Install Snyk CLI for local scanning:

```bash
npm install -g snyk
snyk auth
snyk test
snyk monitor
```

### Snyk API

Use Snyk API for custom integrations:

```bash
# Test dependencies
curl -X POST https://snyk.io/api/v1/test/npm \
  -H "Authorization: token <SNYK_TOKEN>" \
  -d '{"org": "<org-id>", "package": {"name": "express", "version": "4.18.0"}}'
```

## Integration with Other Tools

### GitHub Security Tab

Snyk integrates with GitHub Security tab:
- Vulnerability alerts
- Dependabot integration
- Security advisories
- Code scanning alerts

### Slack Notifications

Configure Slack notifications:
1. Go to Snyk dashboard
2. Navigate to Integrations
3. Add Slack integration
4. Configure notification rules

### Jira Integration

Track vulnerabilities in Jira:
1. Go to Snyk dashboard
2. Navigate to Integrations
3. Add Jira integration
4. Configure project mapping

## Security Checklist

- [ ] Snyk account created
- [ ] Snyk token generated
- [ ] SNYK_TOKEN configured in GitHub
- [ ] CI/CD integration verified
- [ ] Severity thresholds configured
- [ ] Snyk monitor enabled
- [ ] Snyk Code enabled (optional)
- [ ] Docker scanning configured (optional)
- [ ] Notification channels configured
- [ ] Security policies documented
- [ ] Team trained on Snyk
- [ ] Regular scanning schedule established

## Additional Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk GitHub Actions](https://github.com/snyk/actions)
- [Snyk Best Practices](https://snyk.io/learn/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [CVE Database](https://cve.mitre.org/)
