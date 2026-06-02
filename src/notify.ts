// User-facing toast. Phase 0 must not fail silently (spec §4.4).

export function toast(message: string): void {
  const pw = new Zotero.ProgressWindow({}); // constructor takes an options object
  pw.changeHeadline('Vocab Flow');
  pw.addDescription(message);
  pw.show();
  pw.startCloseTimer(3000);
}
