import test from 'node:test';
import assert from 'node:assert/strict';
import { onMainWindowLoad, startup } from '../src/bootstrap';

function setupZotero(inserted: string[]) {
  const mozXULElement = {
    insertFTLIfNeeded(href: string) {
      inserted.push(href);
    }
  };

  (globalThis as any).Zotero = {
    initializationPromise: Promise.resolve(),
    getMainWindow() {
      return { MozXULElement: mozXULElement };
    },
    MenuManager: {
      registerMenu() {
        return 'registered-menu-id';
      }
    },
    Prefs: {
      get() {
        return true;
      }
    },
    debug() {}
  };

  return mozXULElement;
}

test('startup injects the Fluent locale file before native menus render', async () => {
  const inserted: string[] = [];
  setupZotero(inserted);

  await startup({ id: 'vocabflow@moon.com', version: '0.0.1', rootURI: 'root/' });

  assert.deepEqual(inserted, ['vocab-flow.ftl']);
});

test('new main windows receive the Fluent locale file after startup', async () => {
  const inserted: string[] = [];
  const mozXULElement = setupZotero(inserted);

  await startup({ id: 'vocabflow@moon.com', version: '0.0.1', rootURI: 'root/' });
  onMainWindowLoad({ window: { MozXULElement: mozXULElement } });

  assert.deepEqual(inserted, ['vocab-flow.ftl', 'vocab-flow.ftl']);
});
