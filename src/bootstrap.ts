import { Logger } from './Logger';
import { VocabFlowMenuManager } from './menuManager';

class Bootstrap {
  private menuManager?: VocabFlowMenuManager;

  install() {}

  async startup({ rootURI }: { id: string; version: string; rootURI: string }) {
    void rootURI;
    await Zotero.initializationPromise;
    try {
      this.menuManager = new VocabFlowMenuManager();
      this.menuManager.register();
      Logger.log('menuManager OK');
    } catch (e) { Logger.error('menuManager FAIL', e); }
  }

  shutdown() {
    this.menuManager?.unregister();
  }

  uninstall() {}
  onMainWindowLoad() {}
  onMainWindowUnload() {}
}

const BOOTSTRAP = new Bootstrap();

export function install() { BOOTSTRAP.install(); }
export async function startup(data: any) { await BOOTSTRAP.startup(data); }
export function shutdown() { BOOTSTRAP.shutdown(); }
export function uninstall() { BOOTSTRAP.uninstall(); }
export function onMainWindowLoad() { BOOTSTRAP.onMainWindowLoad(); }
export function onMainWindowUnload() { BOOTSTRAP.onMainWindowUnload(); }
