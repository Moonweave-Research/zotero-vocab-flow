import test from 'node:test';
import assert from 'node:assert/strict';
import { readPngSize, runChecks } from '../scripts/release-check';

test('reads PNG dimensions from the IHDR header', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([0, 0, 0, 48, 0, 0, 0, 48, 8, 6, 0, 0, 0])
  ]);

  assert.deepEqual(readPngSize(png), { width: 48, height: 48 });
});

test('release check validates the current repository release surface', () => {
  const result = runChecks({ requireXpi: false });

  assert.deepEqual(result.failures, []);
  assert.ok(result.checks.includes('package and manifest versions match: 0.1.0'));
  assert.ok(result.checks.includes('addon/icon.png is 48x48'));
});
