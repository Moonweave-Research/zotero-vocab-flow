import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  assert.ok(result.checks.includes('package and manifest versions match: 0.1.4'));
  assert.ok(result.checks.includes('addon/icon.png is 48x48'));
  assert.ok(result.checks.includes('updates.json contains update entry for 0.1.4'));
  assert.ok(result.checks.includes('docs/RELEASE_PROCESS.md defines the release artifact and checksum policy'));
});

test('release check uses version-aware release notes path', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-check-'));

  fs.mkdirSync(path.join(tempRoot, 'addon'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'docs'), { recursive: true });

  fs.writeFileSync(
    path.join(tempRoot, 'package.json'),
    JSON.stringify({ version: '0.2.0' }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(tempRoot, 'addon', 'manifest.json'),
    JSON.stringify({
      version: '0.2.0',
      applications: {
        zotero: {
          id: 'vocabflow@moon.com',
          update_url: 'https://raw.githubusercontent.com/Moonweave-Research/zotero-vocab-flow/main/updates.json',
          strict_min_version: '9.0',
          strict_max_version: '9.0.*'
        }
      }
    }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(tempRoot, 'updates.json'),
    JSON.stringify({
      addons: {
        'vocabflow@moon.com': {
          updates: [
            {
              version: '0.2.0',
              update_link: 'https://github.com/Moonweave-Research/zotero-vocab-flow/releases/download/v0.2.0-beta.1/zotero-vocab-flow.xpi',
              update_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              applications: {
                zotero: {
                  strict_min_version: '9.0',
                  strict_max_version: '9.0.*'
                }
              }
            }
          ]
        }
      }
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(tempRoot, 'README.md'), 'Current release: v0.2.0-beta\n', 'utf8');
  fs.writeFileSync(
    path.join(tempRoot, 'docs', 'RELEASE_CHECKLIST.md'),
    'Release checklist for v0.2.0-beta\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(tempRoot, 'docs', 'RELEASE_NOTES_v0.2.0-beta.md'),
    '# Release Notes\n\nVersion: v0.2.0-beta\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(tempRoot, 'docs', 'RELEASE_PROCESS.md'),
    [
      '# Release Process',
      '',
      'Published asset: zotero-vocab-flow.xpi',
      'Update manifest: updates.json',
      'Checksum field: update_hash',
      'Release body checksum: SHA-256',
      'Gate: npm run release:check'
    ].join('\n'),
    'utf8'
  );

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([0, 0, 0, 48, 0, 0, 0, 48, 8, 6, 0, 0, 0])
  ]);
  fs.writeFileSync(path.join(tempRoot, 'addon', 'icon.png'), png);

  const releaseCheckPath = path.resolve(process.cwd(), 'scripts', 'release-check.js');
  const priorRoot = process.env.VOCAB_FLOW_ROOT;
  delete require.cache[releaseCheckPath];
  process.env.VOCAB_FLOW_ROOT = tempRoot;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runChecks: runChecksForTempRoot } = require(releaseCheckPath);
    const result = runChecksForTempRoot({ requireXpi: false });
    assert.deepEqual(result.failures, []);
    assert.ok(result.checks.includes('README.md mentions v0.2.0-beta'));
    assert.ok(result.checks.includes('docs/RELEASE_NOTES_v0.2.0-beta.md mentions v0.2.0-beta'));
  } finally {
    if (priorRoot === undefined) {
      delete process.env.VOCAB_FLOW_ROOT;
    } else {
      process.env.VOCAB_FLOW_ROOT = priorRoot;
    }
    delete require.cache[releaseCheckPath];
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
