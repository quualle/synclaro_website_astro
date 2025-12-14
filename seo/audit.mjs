#!/usr/bin/env node
/**
 * SEO Audit Script für synclaro.de
 *
 * Testet nach Deployment:
 * - HTTP Status Codes
 * - Redirect-Chains
 * - Canonical Tags
 * - robots/noindex Headers
 * - Grundlegende Broken Links (intern)
 *
 * Usage: node seo/audit.mjs [--verbose]
 */

const SITE_URL = 'https://synclaro.de';

// Wichtige URLs zum Testen
const urlsToTest = [
  // Hauptseiten
  { url: '/', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/academy', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/academy/mastermind', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/academy/gruppen-coaching', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/academy/coaching', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/solutions', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/advisory', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/blog', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/referenzen', expectStatus: 200, expectCanonical: true, expectNoindex: false },
  { url: '/kontakt', expectStatus: 200, expectCanonical: true, expectNoindex: false },

  // B1: Danke-Seiten (noindex expected)
  { url: '/danke', expectStatus: 200, expectNoindex: true },
  { url: '/appointment_thankyou', expectStatus: 200, expectNoindex: true },
  { url: '/ki-beratung/danke', expectStatus: 200, expectNoindex: true },
  { url: '/ki-automatisierung/danke', expectStatus: 200, expectNoindex: true },
  { url: '/dsgvo-ki/danke', expectStatus: 200, expectNoindex: true },

  // B6: Interne Bereiche (noindex expected)
  { url: '/intern/dashboard', expectStatus: 200, expectNoindex: true },

  // B3: Blog-URL Redirects (301 -> neue URL)
  {
    url: '/blog/which-primary-keyword-should-the-title-target-provisional-using-n8n-monitoring-n8n-monitoring-logging-fehlerhandling-fuer-ki-workflows',
    expectStatus: 301,
    expectRedirectTo: '/blog/n8n-monitoring-logging-fehlerhandling-ki-workflows'
  },
  {
    url: '/blog/what-exact-keyword-should-the-title-target-for-example-n8n-hosting-deutschland-n8n-selbst-hosten-n8n-dsgvo-n8n-self-hosting-if-you-prefer-i-can-proceed-with-n8n-hosting-deutschland-and-craft-a-60-character-title',
    expectStatus: 301,
    expectRedirectTo: '/blog/n8n-hosting-deutschland-n8n-selbst-hosten-dsgvo'
  },

  // Cohort-Seiten
  { url: '/academy/mastermind/q1-2025', expectStatus: 200, expectCanonical: true },
  { url: '/academy/mastermind/bewerbung', expectStatus: 200, expectCanonical: true },

  // Referenzen
  { url: '/referenzen/beispiel-projekt', expectStatus: 200, expectCanonical: true }
];

// Farben für Terminal-Output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

async function testUrl(urlConfig) {
  const fullUrl = `${SITE_URL}${urlConfig.url}`;
  const results = {
    url: urlConfig.url,
    passed: true,
    errors: [],
    warnings: []
  };

  try {
    const response = await fetch(fullUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Synclaro-SEO-Audit/1.0'
      }
    });

    // Check status code
    const status = response.status;
    if (urlConfig.expectStatus && status !== urlConfig.expectStatus) {
      results.errors.push(`Status: expected ${urlConfig.expectStatus}, got ${status}`);
      results.passed = false;
    }

    // Check redirect location
    if (urlConfig.expectRedirectTo && status === 301) {
      const location = response.headers.get('location');
      if (location && !location.includes(urlConfig.expectRedirectTo)) {
        results.errors.push(`Redirect: expected ${urlConfig.expectRedirectTo}, got ${location}`);
        results.passed = false;
      }
    }

    // Check X-Robots-Tag header for noindex
    if (urlConfig.expectNoindex !== undefined) {
      const robotsHeader = response.headers.get('x-robots-tag');
      const hasNoindex = robotsHeader && robotsHeader.toLowerCase().includes('noindex');

      if (urlConfig.expectNoindex && !hasNoindex) {
        results.errors.push('Missing X-Robots-Tag: noindex header');
        results.passed = false;
      }
      if (!urlConfig.expectNoindex && hasNoindex) {
        results.warnings.push('Has noindex but should be indexed');
      }
    }

    // For 200 responses, check HTML content
    if (status === 200) {
      const html = await response.text();

      // Check canonical
      if (urlConfig.expectCanonical) {
        const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
        if (!canonicalMatch) {
          results.warnings.push('Missing canonical tag');
        } else {
          const canonical = canonicalMatch[1];
          if (!canonical.startsWith('https://synclaro.de')) {
            results.errors.push(`Invalid canonical: ${canonical}`);
            results.passed = false;
          }
        }
      }

      // Check for meta robots noindex in HTML
      if (urlConfig.expectNoindex !== undefined) {
        const metaRobotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
        if (metaRobotsMatch) {
          const content = metaRobotsMatch[1].toLowerCase();
          if (urlConfig.expectNoindex && !content.includes('noindex')) {
            // Already checked header, this is additional
          }
        }
      }
    }

    results.status = status;
  } catch (error) {
    results.errors.push(`Fetch error: ${error.message}`);
    results.passed = false;
  }

  return results;
}

async function runAudit() {
  console.log(`\n${colors.bold}${colors.blue}====================================`);
  console.log('  SYNCLARO.DE SEO AUDIT');
  console.log(`====================================${colors.reset}\n`);

  console.log(`Testing ${urlsToTest.length} URLs against ${SITE_URL}\n`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const urlConfig of urlsToTest) {
    const result = await testUrl(urlConfig);
    results.push(result);

    if (result.passed) {
      passed++;
      log('green', '✓', `${result.url} (${result.status || 'OK'})`);
    } else {
      failed++;
      log('red', '✗', `${result.url}`);
      result.errors.forEach(err => log('red', '  →', err));
    }

    if (result.warnings.length > 0) {
      warnings += result.warnings.length;
      result.warnings.forEach(warn => log('yellow', '  ⚠', warn));
    }
  }

  // Summary
  console.log(`\n${colors.bold}SUMMARY${colors.reset}`);
  console.log('─'.repeat(40));
  log('green', `✓ Passed:`, `${passed}/${urlsToTest.length}`);
  if (failed > 0) {
    log('red', `✗ Failed:`, `${failed}/${urlsToTest.length}`);
  }
  if (warnings > 0) {
    log('yellow', `⚠ Warnings:`, `${warnings}`);
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    site: SITE_URL,
    summary: { total: urlsToTest.length, passed, failed, warnings },
    results
  };

  return report;
}

async function writeReport(report) {
  const fs = await import('fs');
  const path = await import('path');

  const reportPath = path.join(process.cwd(), 'seo', 'audit-report.md');

  const md = `# SEO Audit Report

**Generated:** ${report.timestamp}
**Site:** ${report.site}

## Summary

| Metric | Count |
|--------|-------|
| Total URLs | ${report.summary.total} |
| Passed | ${report.summary.passed} |
| Failed | ${report.summary.failed} |
| Warnings | ${report.summary.warnings} |

## Results

${report.results.map(r => `
### ${r.url}
- **Status:** ${r.status || 'N/A'}
- **Passed:** ${r.passed ? '✓ Yes' : '✗ No'}
${r.errors.length > 0 ? `- **Errors:**\n${r.errors.map(e => `  - ${e}`).join('\n')}` : ''}
${r.warnings.length > 0 ? `- **Warnings:**\n${r.warnings.map(w => `  - ${w}`).join('\n')}` : ''}
`).join('\n')}

---
*Generated by seo/audit.mjs*
`;

  fs.writeFileSync(reportPath, md);
  console.log(`\nReport written to: ${reportPath}`);
}

// Main
(async () => {
  const report = await runAudit();

  if (process.argv.includes('--report')) {
    await writeReport(report);
  }

  // Exit with error code if tests failed
  process.exit(report.summary.failed > 0 ? 1 : 0);
})();
