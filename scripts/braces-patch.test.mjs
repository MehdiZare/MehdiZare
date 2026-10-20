import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyInstalledBraces, verifyBracesPackage } from './verify-braces-patch.mjs';
import { isPatchedBracesAdvisory } from './audit-dependencies.mjs';

test('every installed braces copy has verified code and rejects depth/cycle attacks', () => {
  assert.ok(verifyInstalledBraces() > 0);
});

test('the audit exception refuses unpatched files even with the expected package version', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mz-unpatched-braces-'));
  try {
    await mkdir(join(dir, 'lib'));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'braces', version: '3.0.3' }));
    await writeFile(join(dir, 'index.js'), 'module.exports = () => {};');
    assert.throws(() => verifyBracesPackage(dir), /Unverified braces file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('the audit exception cannot hide other advisories, packages or versions', () => {
  const advisory = { module_name: 'braces', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', findings: [{ version: '3.0.3' }] };
  assert.equal(isPatchedBracesAdvisory(advisory), true);
  for (const changes of [
    { module_name: 'another-package' }, { url: 'https://github.com/advisories/GHSA-other' },
    { findings: [] }, { findings: [{ version: '3.0.2' }] },
    { findings: [{ version: '3.0.3' }, { version: '3.0.2' }] },
  ]) assert.equal(isPatchedBracesAdvisory({ ...advisory, ...changes }), false);
});
