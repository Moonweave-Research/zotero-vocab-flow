import { Logger } from './Logger';

// User-facing toast. Phase 0 must not fail silently (spec §4.4).

export function toast(message: string): void {
  try {
    const pw = new Zotero.ProgressWindow({}); // constructor takes an options object
    pw.changeHeadline('Vocab Flow');
    pw.addDescription(message);
    pw.show();
    pw.startCloseTimer(3000);
  } catch (e) {
    Logger.error('toast notification failed', e);
    alertFallback(message);
  }
}

function alertFallback(message: string): void {
  const win = Zotero.getMainWindow?.();
  if (typeof win?.alert === 'function') {
    win.alert(`Vocab Flow: ${message}`);
    return;
  }
  if (typeof globalThis.alert === 'function') {
    globalThis.alert(`Vocab Flow: ${message}`);
  }
}
