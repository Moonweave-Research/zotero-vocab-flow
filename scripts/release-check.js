const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.VOCAB_FLOW_ROOT || process.cwd());
const XPI_NAME = 'zotero-vocab-flow.xpi';
const UPDATE_MANIFEST_NAME = 'updates.json';

function readJSON(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function checkVersionMention(file, expectedText, checks, failures) {
  try {
    const text = readText(file);
    if (text.includes(expectedText)) {
      checks.push(`${file} mentions ${expectedText}`);
    } else {
      failures.push(`${file} does not mention ${expectedText}`);
    }
  } catch (error) {
    failures.push(`${file} check failed: ${error.message}`);
  }
}

function readPngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('not a PNG file');
  }
  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    throw new Error('PNG missing IHDR chunk');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readZipEntry(zipPath, entryName) {
  return execFileSync('unzip', ['-p', zipPath, entryName], { cwd: ROOT });
}

function sha256File(filePath) {
  const { createHash } = require('crypto');
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertHttpsUrl(value, label, failures) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      failures.push(`${label} must use https`);
    }
    if (url.hostname === 'example.invalid') {
      failures.push(`${label} still points to example.invalid`);
    }
  } catch (error) {
    failures.push(`${label} is not a valid URL: ${error.message}`);
  }
}

function checkReleaseProcessDoc(checks, failures) {
  try {
    const text = readText('docs/RELEASE_PROCESS.md');
    const required = [
      'zotero-vocab-flow.xpi',
      'updates.json',
      'update_hash',
      'SHA-256',
      'npm run release:check'
    ];
    const missing = required.filter((token) => !text.includes(token));
    if (missing.length) {
      failures.push(`docs/RELEASE_PROCESS.md is missing release policy terms: ${missing.join(', ')}`);
    } else {
      checks.push('docs/RELEASE_PROCESS.md defines the release artifact and checksum policy');
    }
  } catch (error) {
    failures.push(`docs/RELEASE_PROCESS.md check failed: ${error.message}`);
  }
}

function runChecks(options = {}) {
  const requireXpi = options.requireXpi !== false;
  const checks = [];
  const failures = [];
  const packageJSON = readJSON('package.json');
  const manifest = readJSON('addon/manifest.json');
  const version = packageJSON.version;
  const zoteroManifest = manifest.applications && manifest.applications.zotero;
  const addonID = zoteroManifest && zoteroManifest.id;

  if (version === manifest.version) {
    checks.push(`package and manifest versions match: ${version}`);
  } else {
    failures.push(`package version ${version} does not match manifest version ${manifest.version}`);
  }

  if (!zoteroManifest || !addonID) {
    failures.push('addon/manifest.json is missing applications.zotero.id');
  } else {
    assertHttpsUrl(zoteroManifest.update_url, 'manifest update_url', failures);
    if (zoteroManifest.update_url && zoteroManifest.update_url.endsWith(`/${UPDATE_MANIFEST_NAME}`)) {
      checks.push(`manifest update_url points to ${UPDATE_MANIFEST_NAME}`);
    } else {
      failures.push(`manifest update_url must point to ${UPDATE_MANIFEST_NAME}`);
    }
  }

  const expectedBeta = `v${version}-beta`;
  const releaseNotesPath = `docs/RELEASE_NOTES_v${version}-beta.md`;
  for (const file of ['README.md', releaseNotesPath, 'docs/RELEASE_CHECKLIST.md']) {
    checkVersionMention(file, expectedBeta, checks, failures);
  }

  try {
    const iconSize = readPngSize(fs.readFileSync(path.join(ROOT, 'addon/icon.png')));
    if (iconSize.width === 48 && iconSize.height === 48) {
      checks.push('addon/icon.png is 48x48');
    } else {
      failures.push(`addon/icon.png is ${iconSize.width}x${iconSize.height}, expected 48x48`);
    }
  } catch (error) {
    failures.push(`addon/icon.png check failed: ${error.message}`);
  }

  const xpiPath = path.join(ROOT, XPI_NAME);
  let xpiHash = null;
  if (!fs.existsSync(xpiPath)) {
    if (requireXpi) {
      failures.push(`${XPI_NAME} is missing; run npm run build first`);
    }
  } else {
    xpiHash = sha256File(xpiPath);
    try {
      const xpiManifest = JSON.parse(readZipEntry(xpiPath, 'manifest.json').toString('utf8'));
      if (xpiManifest.version === version) {
        checks.push(`${XPI_NAME} contains manifest version ${version}`);
      } else {
        failures.push(`${XPI_NAME} manifest version ${xpiManifest.version} does not match ${version}`);
      }
    } catch (error) {
      failures.push(`${XPI_NAME} manifest check failed: ${error.message}`);
    }

    try {
      const xpiIconSize = readPngSize(readZipEntry(xpiPath, 'icon.png'));
      if (xpiIconSize.width === 48 && xpiIconSize.height === 48) {
        checks.push(`${XPI_NAME} contains 48x48 icon.png`);
      } else {
        failures.push(`${XPI_NAME} icon.png is ${xpiIconSize.width}x${xpiIconSize.height}, expected 48x48`);
      }
    } catch (error) {
      failures.push(`${XPI_NAME} icon check failed: ${error.message}`);
    }
  }

  try {
    const updateManifest = readJSON(UPDATE_MANIFEST_NAME);
    const updates = updateManifest.addons && addonID && updateManifest.addons[addonID] && updateManifest.addons[addonID].updates;
    if (!Array.isArray(updates) || updates.length === 0) {
      failures.push(`${UPDATE_MANIFEST_NAME} has no updates for ${addonID || 'the add-on id'}`);
    } else {
      const currentUpdate = updates.find((update) => update.version === version);
      if (!currentUpdate) {
        failures.push(`${UPDATE_MANIFEST_NAME} has no update entry for ${version}`);
      } else {
        checks.push(`${UPDATE_MANIFEST_NAME} contains update entry for ${version}`);
        assertHttpsUrl(currentUpdate.update_link, `${UPDATE_MANIFEST_NAME} update_link`, failures);
        const expectedReleasePath = `/Moonweave-Research/zotero-vocab-flow/releases/download/v${version}-beta.1/${XPI_NAME}`;
        try {
          const updateLink = new URL(currentUpdate.update_link);
          if (updateLink.hostname === 'github.com' && updateLink.pathname === expectedReleasePath) {
            checks.push(`${UPDATE_MANIFEST_NAME} update_link points to v${version}-beta.1 release asset`);
          } else {
            failures.push(`${UPDATE_MANIFEST_NAME} update_link must point to ${expectedReleasePath}`);
          }
        } catch {
          // assertHttpsUrl already reports the invalid URL.
        }

        if (xpiHash) {
          const expectedHash = `sha256:${xpiHash}`;
          if (currentUpdate.update_hash === expectedHash) {
            checks.push(`${UPDATE_MANIFEST_NAME} update_hash matches ${XPI_NAME}`);
          } else {
            failures.push(`${UPDATE_MANIFEST_NAME} update_hash ${currentUpdate.update_hash} does not match ${expectedHash}`);
          }
        } else if (typeof currentUpdate.update_hash === 'string' && /^sha256:[a-f0-9]{64}$/.test(currentUpdate.update_hash)) {
          checks.push(`${UPDATE_MANIFEST_NAME} update_hash is a sha256 digest`);
        } else {
          failures.push(`${UPDATE_MANIFEST_NAME} update_hash must be a sha256 digest`);
        }

        const updateZotero = currentUpdate.applications && currentUpdate.applications.zotero;
        if (
          updateZotero &&
          zoteroManifest &&
          updateZotero.strict_min_version === zoteroManifest.strict_min_version &&
          updateZotero.strict_max_version === zoteroManifest.strict_max_version
        ) {
          checks.push(`${UPDATE_MANIFEST_NAME} Zotero compatibility matches manifest`);
        } else {
          failures.push(`${UPDATE_MANIFEST_NAME} Zotero compatibility does not match addon/manifest.json`);
        }
      }
    }
  } catch (error) {
    failures.push(`${UPDATE_MANIFEST_NAME} check failed: ${error.message}`);
  }

  checkReleaseProcessDoc(checks, failures);

  return { checks, failures };
}

function main() {
  const result = runChecks();
  for (const check of result.checks) {
    console.log(`ok - ${check}`);
  }
  for (const failure of result.failures) {
    console.error(`not ok - ${failure}`);
  }
  if (result.failures.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { readPngSize, runChecks };
