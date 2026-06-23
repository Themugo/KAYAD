// backend/scripts/generateTenantIsolationReport.js
// Generate tenant isolation compliance report

import TenantIsolationAudit from '../services/tenantIsolationAudit.js';
import { logInfo, logError } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

export async function generateTenantIsolationReport() {
  logInfo('Generating tenant isolation compliance report');

  try {
    const audit = new TenantIsolationAudit();
    const results = await audit.runFullAudit();
    const report = audit.generateReport();

    // Write report to file
    const reportPath = path.join(process.cwd(), 'tenant-isolation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownReport = generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), 'tenant-isolation-report.md');
    fs.writeFileSync(markdownPath, markdownReport);

    logInfo('Tenant isolation compliance report generated', {
      score: results.overall.score,
      passed: results.overall.passed,
    });

    return report;
  } catch (error) {
    logError('Failed to generate tenant isolation report', { error: error.message });
    throw error;
  }
}

function generateMarkdownReport(report) {
  const { summary, details } = report;

  let markdown = '# Tenant Isolation Compliance Report\n\n';
  markdown += `**Date**: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  markdown += `**Overall Score**: ${summary.overall.score}%\n`;
  markdown += `**Overall Status**: ${summary.overall.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;

  markdown += '## Executive Summary\n\n';
  markdown += '| Category | Status |\n';
  markdown += '|----------|--------|\n';
  markdown += `| Data Access Boundaries | ${summary.dataAccessBoundaries ? '✅' : '❌'} |\n`;
  markdown += `| RBAC | ${summary.rbac ? '✅' : '❌'} |\n`;
  markdown += `| Audit Logging | ${summary.auditLogging ? '✅' : '❌'} |\n`;
  markdown += `| Cache Isolation | ${summary.cacheIsolation ? '✅' : '❌'} |\n`;
  markdown += `| Search Isolation | ${summary.searchIsolation ? '✅' : '❌'} |\n\n`;

  markdown += '## Detailed Findings\n\n';

  markdown += '### Data Access Boundaries\n\n';
  details.dataAccessBoundaries.findings.forEach(finding => {
    const icon = finding.status === 'pass' ? '✅' : finding.status === 'fail' ? '❌' : 'ℹ️';
    markdown += `${icon} ${finding.message}\n`;
  });

  markdown += '\n### RBAC\n\n';
  details.rbac.findings.forEach(finding => {
    const icon = finding.status === 'pass' ? '✅' : finding.status === 'fail' ? '❌' : 'ℹ️';
    markdown += `${icon} ${finding.message}\n`;
  });

  markdown += '\n### Audit Logging\n\n';
  details.auditLogging.findings.forEach(finding => {
    const icon = finding.status === 'pass' ? '✅' : finding.status === 'fail' ? '❌' : 'ℹ️';
    markdown += `${icon} ${finding.message}\n`;
  });

  markdown += '\n### Cache Isolation\n\n';
  details.cacheIsolation.findings.forEach(finding => {
    const icon = finding.status === 'pass' ? '✅' : finding.status === 'fail' ? '❌' : 'ℹ️';
    markdown += `${icon} ${finding.message}\n`;
  });

  markdown += '\n### Search Isolation\n\n';
  details.searchIsolation.findings.forEach(finding => {
    const icon = finding.status === 'pass' ? '✅' : finding.status === 'fail' ? '❌' : 'ℹ️';
    markdown += `${icon} ${finding.message}\n`;
  });

  markdown += '\n## Recommendations\n\n';

  if (!summary.overall.passed) {
    markdown += '### High Priority\n';
    markdown += '- Address failing categories to improve overall compliance\n';
    markdown += '- Implement missing tenant isolation mechanisms\n';
    markdown += '- Add automated tests for cross-tenant data leakage\n\n';
  }

  if (!summary.dataAccessBoundaries) {
    markdown += '- Ensure all data models have tenant/organization fields\n';
    markdown += '- Implement query-level tenant filtering\n';
    markdown += '- Add middleware to enforce tenant context\n\n';
  }

  if (!summary.searchIsolation) {
    markdown += '- Implement tenant-aware search queries\n';
    markdown += '- Add tenant context to search analytics\n';
    markdown += '- Validate search result isolation\n\n';
  }

  markdown += '### Medium Priority\n';
  markdown += '- Implement automated tenant isolation testing in CI/CD\n';
  markdown += '- Add tenant isolation metrics to monitoring\n';
  markdown += '- Conduct regular tenant isolation audits\n\n';

  markdown += '### Low Priority\n';
  markdown += '- Document tenant isolation architecture\n';
  markdown += '- Train team on tenant isolation best practices\n';
  markdown += '- Review tenant isolation patterns quarterly\n';

  return markdown;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTenantIsolationReport()
    .then(() => {
      console.log('Tenant isolation compliance report generated successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate tenant isolation report:', error);
      process.exit(1);
    });
}
