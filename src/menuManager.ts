import { Logger } from './Logger';
import { extractForItem } from './vocabExtractor';
import { toast } from './notify';

const PLUGIN_ID = 'vocabflow@moon.com';
const MENU_ID = 'vocabflow-library-item-menu';

export class VocabFlowMenuManager {
  private registeredMenuID: string | false | null = null;

  public register() {
    if (!Zotero.MenuManager?.registerMenu || this.registeredMenuID) return;

    this.registeredMenuID = Zotero.MenuManager.registerMenu({
      menuID: MENU_ID,
      pluginID: PLUGIN_ID,
      target: 'main/library/item',
      menus: [
        {
          menuType: 'submenu',
          l10nID: 'vocab-flow-menu',
          label: 'Vocab Flow',
          onShowing: (_event: Event, context: any) => {
            context?.setVisible?.(this.getRegularItems(context).length > 0);
          },
          menus: [
            {
              menuType: 'menuitem',
              l10nID: 'vocab-flow-extract',
              label: '밑줄 단어 추출',
              onCommand: (_event: Event, context: any) => this.run(context)
            }
          ]
        }
      ]
    });
  }

  public unregister() {
    if (this.registeredMenuID && Zotero.MenuManager?.unregisterMenu) {
      Zotero.MenuManager.unregisterMenu(this.registeredMenuID);
    }
    this.registeredMenuID = null;
  }

  private async run(context?: any) {
    const items = this.getRegularItems(context);
    if (!items.length) return;

    let pdfMissing = 0;
    for (const item of items) {
      try {
        if (!(item.getAttachments?.() ?? []).some((id: number) => Zotero.Items.get(id)?.isPDFAttachment?.())) {
          pdfMissing++;
          continue;
        }
        await extractForItem(item);
      } catch (e) {
        Logger.error(`vocab extract failed for item ${item?.id}`, e);
        toast('단어 추출 중 오류가 발생했습니다');
      }
    }
    if (pdfMissing === items.length) toast('이 항목에 PDF가 없습니다');
  }

  private getRegularItems(context?: any): any[] {
    const contextItems = Array.isArray(context?.items) ? context.items : [];
    const normalized = contextItems
      .map((item: any) => (typeof item?.id === 'number' ? Zotero.Items.get(item.id) ?? item : item))
      .filter((item: any) => item?.isRegularItem?.());
    if (normalized.length) return normalized;

    const pane = Zotero.getActiveZoteroPane?.();
    const selected = pane?.getSelectedItems?.() ?? [];
    return selected.filter((item: any) => item?.isRegularItem?.());
  }
}
