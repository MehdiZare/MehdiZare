import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const proof = JSON.parse(readFileSync(new URL('../patches/braces-verification.json', import.meta.url), 'utf8'));

export function verifyBracesPackage(directory) {
  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  if (pkg.name !== 'braces' || pkg.version !== proof.version) throw new Error('Unrecognized braces version; audit exception refused');
  for (const [file, expected] of Object.entries(proof.sha256)) {
    const actual = createHash('sha256').update(readFileSync(join(directory, file))).digest('hex');
    if (actual !== expected) throw new Error(`Unverified braces file ${file}; audit exception refused`);
  }
  const check = spawnSync(process.execPath, ['--stack-size=512', join(root, 'scripts/check-braces-depth.cjs'), directory], {
    cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024,
  });
  if (check.error || check.status !== 0) throw new Error(`Braces regression check failed: ${check.error?.message ?? check.stderr}`);
}

export function verifyInstalledBraces() {
  const result = spawnSync('pnpm', ['why', '-r', 'braces', '--json'], {
    cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error('Cannot enumerate braces copies; audit exception refused');
  const packages = JSON.parse(result.stdout);
  if (!Array.isArray(packages) || packages.length === 0) throw new Error('No verifiable braces copies; audit exception refused');
  for (const pkg of packages) {
    if (pkg.name !== 'braces' || typeof pkg.path !== 'string') throw new Error('Unexpected dependency inventory; audit exception refused');
    verifyBracesPackage(pkg.path);
  }
  return packages.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Verified patched code and depth/cycle regressions for ${verifyInstalledBraces()} braces installation(s).`);
}
