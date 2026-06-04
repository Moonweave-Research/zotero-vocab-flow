const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.VOCAB_FLOW_ROOT || process.cwd());
const XPI_NAME = 'zotero-vocab-flow.xpi';

function readJSON(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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

function runChecks(options = {}) {
  const requireXpi = options.requireXpi !== false;
  const checks = [];
  const failures = [];
  const packageJSON = readJSON('package.json');
  const manifest = readJSON('addon/manifest.json');
  const version = packageJSON.version;

  if (version === manifest.version) {
    checks.push(`package and manifest versions match: ${version}`);
  } else {
    failures.push(`package version ${version} does not match manifest version ${manifest.version}`);
  }

  const expectedBeta = `v${version}-beta`;
  for (const file of ['README.md', 'docs/RELEASE_NOTES_v0.1.0-beta.md', 'docs/RELEASE_CHECKLIST.md']) {
    const text = readText(file);
    if (text.includes(expectedBeta)) {
      checks.push(`${file} mentions ${expectedBeta}`);
    } else {
      failures.push(`${file} does not mention ${expectedBeta}`);
    }
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
  if (!fs.existsSync(xpiPath)) {
    if (requireXpi) {
      failures.push(`${XPI_NAME} is missing; run npm run build first`);
    }
  } else {
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
