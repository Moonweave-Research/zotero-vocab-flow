const esbuild = require('esbuild');
const { execFileSync } = require('child_process');
const fs = require('fs');

const XPI_NAME = 'zotero-vocab-flow.xpi';
const FIXED_MTIME = new Date('2026-01-01T00:00:00Z');

function normalizeAddonTimestamps(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      normalizeAddonTimestamps(entryPath);
    }
    fs.utimesSync(entryPath, FIXED_MTIME, FIXED_MTIME);
  }
  fs.utimesSync(dir, FIXED_MTIME, FIXED_MTIME);
}

esbuild.build({
  entryPoints: ['src/bootstrap.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'VocabFlowBootstrap',
  outfile: 'addon/bootstrap.js',
  target: 'es2022',
  external: ['Zotero', 'Components', 'Services'],
  footer: {
    js: [
      'var install = VocabFlowBootstrap.install;',
      'var startup = VocabFlowBootstrap.startup;',
      'var shutdown = VocabFlowBootstrap.shutdown;',
      'var uninstall = VocabFlowBootstrap.uninstall;',
      'var onMainWindowLoad = VocabFlowBootstrap.onMainWindowLoad;',
      'var onMainWindowUnload = VocabFlowBootstrap.onMainWindowUnload;'
    ].join(' ')
  }
}).then(() => {
  normalizeAddonTimestamps('addon');
  if (fs.existsSync(XPI_NAME)) fs.unlinkSync(XPI_NAME);
  execFileSync('zip', ['-X', '-r', `../${XPI_NAME}`, '.', '-x', '*.DS_Store'], { cwd: 'addon', stdio: 'inherit' });
  console.log(`Created ${XPI_NAME}`);
}).catch((error) => { console.error(error); process.exit(1); });
