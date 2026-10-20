import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyInstalledBraces } from './verify-braces-patch.mjs';

// The upstream version remains 3.0.3 after pnpm patch. This exact advisory is
// accepted only for the independently verified source patch; see patches/README.md.
export function isPatchedBracesAdvisory(advisory) {
  return advisory.module_name === 'braces'
    && advisory.url === 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'
    && Array.isArray(advisory.findings) && advisory.findings.length > 0
    && advisory.findings.every(finding => finding.version === '3.0.3');
}

export function auditDependencies() {
  const audit = spawnSync('pnpm', ['audit', '--audit-level', 'high', '--json'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  if (audit.error || ![0, 1].includes(audit.status)) throw new Error('Dependency audit did not complete');
  const report = JSON.parse(audit.stdout);
  const counts = report.metadata?.vulnerabilities;
  if (!counts || !Number.isInteger(counts.high) || !Number.isInteger(counts.critical) || !report.advisories) {
    throw new Error('Unrecognized audit response; refusing to pass');
  }
  console.log(`Registry audit: ${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate.`);
  let verified = false;
  let blockers = 0;
  const serious = Object.values(report.advisories).filter(a => ['high', 'critical'].includes(a.severity));
  if (serious.length === 0 && (counts.high > 0 || counts.critical > 0 || audit.status !== 0)) {
    throw new Error('Audit failure has no inspectable advisories');
  }
  for (const advisory of serious) {
    if (isPatchedBracesAdvisory(advisory)) {
      if (!verified) verifyInstalledBraces();
      verified = true;
      console.log(`Locally mitigated, upstream release pending: ${advisory.url}`);
    } else {
      blockers++;
      console.error(`${advisory.severity}: ${advisory.module_name}: ${advisory.title} (${advisory.url})`);
    }
  }
  if (blockers) throw new Error(`${blockers} unmitigated high/critical advisory(s)`);
  console.log('Dependency gate passed; every high/critical finding is fixed or has the verified local braces mitigation.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) auditDependencies();
