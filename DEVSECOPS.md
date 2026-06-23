# Enterprise DevSecOps Controls

## Overview

This document outlines the enterprise DevSecOps controls implemented for the KAYAD platform, including automated security scanning, vulnerability management, and compliance checks integrated into the CI/CD pipeline.

## Security Tools

### GitHub CodeQL
- **Purpose**: Static Application Security Testing (SAST)
- **Languages**: JavaScript, Python
- **Frequency**: On push to main, on pull requests, weekly scheduled
- **Severity Threshold**: Blocks on critical findings
- **Workflow**: `.github/workflows/codeql-analysis.yml`

### Gitleaks
- **Purpose**: Secret scanning and detection
- **Frequency**: On push to main, on pull requests, daily scheduled
- **Severity Threshold**: Blocks on any secret detection
- **Workflow**: `.github/workflows/gitleaks-scan.yml`
- **Configuration**: `.gitleaks.toml`

### Trivy
- **Purpose**: Container vulnerability scanning
- **Scope**: Backend and frontend Docker images
- **Frequency**: On push to main, on pull requests, daily scheduled
- **Severity Threshold**: Blocks on critical findings
- **Workflow**: `.github/workflows/trivy-scan.yml`

### Dependency Track
- **Purpose**: Software Composition Analysis (SCA)
- **Frequency**: On push to main, on pull requests, daily scheduled
- **Severity Threshold**: Blocks on critical, >5 high findings
- **Workflow**: `.github/workflows/sbom-generation.yml`

### License Checker
- **Purpose**: License compliance verification
- **Frequency**: On push to main, on pull requests, weekly scheduled
- **Allowed Licenses**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, Unlicense, WTFPL
- **Disallowed Licenses**: GPL, AGPL, LGPL, MPL, CPL, EPL, SSPL, CPAL
- **Workflow**: `.github/workflows/license-compliance.yml`

## SBOM Generation

### CycloneDX SBOM
- **Format**: CycloneDX JSON
- **Components**: Backend, Frontend
- **Frequency**: On push to main, on pull requests, daily scheduled
- **Upload**: Dependency Track
- **Workflow**: `.github/workflows/sbom-generation.yml`

### SBOM Contents
- Component name and version
- Dependencies and their versions
- License information
- Vulnerability data
- Hash values

## CI/CD Integration

### Security Gate
- **Workflow**: `.github/workflows/security-gate.yml`
- **Triggers**: Pull requests, push to main
- **Blocking Rules**:
  - Critical CodeQL findings: Block
  - Critical Trivy findings: Block
  - Secret detection: Block
  - Critical dependency vulnerabilities: Block
  - >5 high dependency vulnerabilities: Block
  - Disallowed licenses: Block

### Release Blocking
- All security scans must pass before release
- Critical findings block deployment
- High findings require review
- Medium/Low findings are tracked but don't block

## Security Reports

### Automated Reports
- **Workflow**: `.github/workflows/security-reports.yml`
- **Frequency**: Daily at 7 AM UTC
- **Contents**:
  - Executive summary
  - CodeQL results
  - Trivy results
  - Dependency Track findings
  - License compliance status
  - Remediation dashboard

### Report Distribution
- GitHub Issue creation
- Slack notification
- Artifact upload
- Historical tracking

## Remediation Dashboard

### Severity Levels
- **Critical**: Fix immediately (blocks release)
- **High**: Fix within 7 days
- **Medium**: Fix within 30 days
- **Low**: Fix within 90 days

### Remediation Process
1. **Detection**: Automated scan identifies vulnerability
2. **Triage**: Security team assesses severity and impact
3. **Assignment**: Issue assigned to appropriate team
4. **Remediation**: Team implements fix
5. **Verification**: Security team verifies fix
6. **Closure**: Issue marked as resolved

### Tracking
- GitHub Issues for tracking
- Labels for severity
- Milestones for timelines
- Assignees for accountability

## Configuration

### Required Secrets
- `GITHUB_TOKEN`: GitHub authentication (automatic)
- `GITLEAKS_LICENSE`: Gitleaks license key
- `DEPENDENCY_TRACK_URL`: Dependency Track instance URL
- `DEPENDENCY_TRACK_API_KEY`: Dependency Track API key
- `DEPENDENCY_TRACK_PROJECT_ID`: Dependency Track project ID
- `SLACK_SECURITY_WEBHOOK`: Slack webhook for notifications

### Environment Variables
- `SECURITY_SCAN_ENABLED`: Enable/disable security scans
- `BLOCK_ON_CRITICAL`: Block release on critical findings
- `BLOCK_ON_HIGH_THRESHOLD`: Number of high findings to block

## Workflows

### codeql-analysis.yml
- Triggers: Push to main, PR, weekly
- Languages: JavaScript, Python
- Output: SARIF file uploaded to GitHub Security

### gitleaks-scan.yml
- Triggers: Push to main, PR, daily
- Configuration: `.gitleaks.toml`
- Output: JSON report, SARIF file

### trivy-scan.yml
- Triggers: Push to main, PR, daily
- Targets: Backend, frontend Docker images
- Output: SARIF file, JSON report

### sbom-generation.yml
- Triggers: Push to main, PR, daily
- Tool: CycloneDX npm
- Upload: Dependency Track
- Output: SBOM JSON file

### license-compliance.yml
- Triggers: Push to main, PR, weekly
- Tool: license-checker
- Output: JSON report

### security-reports.yml
- Triggers: Daily, manual
- Output: Markdown report, GitHub Issue

### security-gate.yml
- Triggers: PR, push to main
- Purpose: Block release on critical findings
- Output: Pass/fail status

## Best Practices

### Development
- Never commit secrets
- Use environment variables for sensitive data
- Keep dependencies updated
- Review security alerts regularly
- Follow secure coding practices

### Operations
- Monitor security scan results
- Respond to critical findings immediately
- Maintain up-to-date security tools
- Review and update security policies
- Conduct regular security training

### Compliance
- Follow license policies
- Document security exceptions
- Maintain audit trail
- Conduct security audits
- Report security incidents

## Metrics

### Security Metrics
- Critical vulnerabilities: 0 (target)
- High vulnerabilities: <5 (target)
- Mean time to remediate (MTTR): <7 days for critical
- False positive rate: <10%
- Scan success rate: >99%

### Compliance Metrics
- License compliance: 100%
- SBOM generation: 100%
- Security gate pass rate: >95%
- Vulnerability coverage: 100%

## References

- [GitHub CodeQL Documentation](https://codeql.github.com/docs/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Dependency Track Documentation](https://docs.dependencytrack.org/)
- [CycloneDX Specification](https://cyclonedx.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Support

### Security Team
- **Contact**: security@kayad.co.ke
- **Slack**: #security
- **On-Call**: [Contact]

### Incident Response
- **Severity**: P0 - Critical
- **Response Time**: 15 minutes
- **Escalation**: CTO within 1 hour
