import { Logger } from './Logger';
import { VocabFlowMenuManager } from './menuManager';

const LOCALE_HREF = 'vocab-flow.ftl';

class Bootstrap {
  private menuManager?: VocabFlowMenuManager;
  private started = false;

  install() {}

  async startup({ rootURI }: { id: string; version: string; rootURI: string }) {
    void rootURI;
    await Zotero.initializationPromise;
    this.started = true;
    try {
      this.injectLocale(Zotero.getMainWindow?.());
      this.menuManager = new VocabFlowMenuManager();
      this.menuManager.register();
      Logger.log('menuManager OK');
    } catch (e) { Logger.error('menuManager FAIL', e); }
  }

  shutdown() {
    this.started = false;
    this.menuManager?.unregister();
  }

  uninstall() {}
  onMainWindowLoad({ window }: { window: Window }) {
    if (!this.started) return;
    this.injectLocale(window);
  }
  onMainWindowUnload() {}

  private injectLocale(win?: Window) {
    const mozXULElement = (win as any)?.MozXULElement;
    const insertFTLIfNeeded = mozXULElement?.insertFTLIfNeeded;
    if (typeof insertFTLIfNeeded !== 'function') return;

    insertFTLIfNeeded.call(mozXULElement, LOCALE_HREF);
  }
}

const BOOTSTRAP = new Bootstrap();

export function install() { BOOTSTRAP.install(); }
export async function startup(data: any) { await BOOTSTRAP.startup(data); }
export function shutdown() { BOOTSTRAP.shutdown(); }
export function uninstall() { BOOTSTRAP.uninstall(); }
export function onMainWindowLoad(data: any) { BOOTSTRAP.onMainWindowLoad(data); }
export function onMainWindowUnload() { BOOTSTRAP.onMainWindowUnload(); }
