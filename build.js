const esbuild = require('esbuild');
const { execFileSync } = require('child_process');
const fs = require('fs');

const XPI_NAME = 'zotero-vocab-flow.xpi';

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
  if (fs.existsSync(XPI_NAME)) fs.unlinkSync(XPI_NAME);
  execFileSync('zip', ['-r', `../${XPI_NAME}`, '.', '-x', '*.DS_Store'], { cwd: 'addon', stdio: 'inherit' });
  console.log(`Created ${XPI_NAME}`);
}).catch((error) => { console.error(error); process.exit(1); });
