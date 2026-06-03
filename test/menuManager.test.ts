import test from 'node:test';
import assert from 'node:assert/strict';
import { VocabFlowMenuManager } from '../src/menuManager';

test('registers localized labels for every color extraction menu', () => {
  let registered: any;
  (globalThis as any).Zotero = {
    MenuManager: {
      registerMenu: (config: any) => {
        registered = config;
        return 'menu-id';
      }
    }
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    toast: () => {}
  });
  manager.register();

  const colorMenus = registered.menus[0].menus.slice(0, 6);
  assert.deepEqual(colorMenus.map((menu: any) => menu.l10nID), [
    'vocab-flow-extract-green',
    'vocab-flow-extract-yellow',
    'vocab-flow-extract-blue',
    'vocab-flow-extract-purple',
    'vocab-flow-extract-red',
    'vocab-flow-extract-gray'
  ]);
});

test('registers menu commands for user-facing translation provider control', () => {
  let registered: any;
  (globalThis as any).Zotero = {
    MenuManager: {
      registerMenu: (config: any) => {
        registered = config;
        return 'menu-id';
      }
    }
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    toast: () => {}
  });
  manager.register();

  const l10nIDs = registered.menus[0].menus.map((menu: any) => menu.l10nID);
  assert.ok(l10nIDs.includes('vocab-flow-translation-enable-google-free'));
  assert.ok(l10nIDs.includes('vocab-flow-translation-disable'));
  const labels = registered.menus[0].menus.map((menu: any) => menu.label);
  assert.ok(labels.includes('실험 번역 보조 기능 켜기...'));
  assert.ok(labels.includes('번역 보조 기능 끄기'));
});

test('enables the experimental translation provider through the menu after confirmation', async () => {
  const toasts: string[] = [];
  const providers: string[] = [];
  let confirmed = false;
  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    confirmEnableTranslation: () => {
      confirmed = true;
      return true;
    },
    setTranslationProvider: (provider) => {
      providers.push(provider);
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runEnableGoogleFreeTranslationForTesting();

  assert.equal(confirmed, true);
  assert.deepEqual(providers, ['google-free']);
  assert.equal(toasts[0], '실험 번역 보조 기능을 켰습니다');
});

test('does not enable translation when the provider confirmation is canceled', async () => {
  const providers: string[] = [];
  const toasts: string[] = [];
  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    confirmEnableTranslation: () => false,
    setTranslationProvider: (provider) => {
      providers.push(provider);
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runEnableGoogleFreeTranslationForTesting();

  assert.deepEqual(providers, []);
  assert.equal(toasts[0], '실험 번역 보조 기능 설정을 취소했습니다');
});

test('disables translation through the menu', async () => {
  const providers: string[] = [];
  const toasts: string[] = [];
  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    setTranslationProvider: (provider) => {
      providers.push(provider);
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runDisableTranslationForTesting();

  assert.deepEqual(providers, ['off']);
  assert.equal(toasts[0], '번역 보조 기능을 껐습니다');
});

test('summarizes mixed multi-item extraction results', async () => {
  const toasts: string[] = [];
  const extracted: number[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 10 ? pdfAttachment : null) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [
        { id: 1, isRegularItem: () => true, getAttachments: () => [10] },
        { id: 2, isRegularItem: () => true, getAttachments: () => [] }
      ]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async (item: any) => { extracted.push(item.id); return { status: 'candidates', candidateCount: 3 }; },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runForTesting();

  assert.deepEqual(extracted, [1]);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /1개 후보 노트/);
  assert.match(toasts[0], /1개 PDF 없음/);
});

test('reports underline-empty items separately from successful items', async () => {
  const toasts: string[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [
        { id: 1, isRegularItem: () => true, getAttachments: () => [10] },
        { id: 2, isRegularItem: () => true, getAttachments: () => [11] }
      ]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async (item: any) => item.id === 1
      ? { status: 'empty' }
      : { status: 'candidates', candidateCount: 5 },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runForTesting();

  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /1개 후보 노트/);
  assert.match(toasts[0], /1개 후보 없음/);
});

test('uses candidate-color underlines by default and exposes tag and all-underlines paths', async () => {
  const calls: any[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async (_item: any, options?: any) => {
      calls.push(options ?? {});
      return { status: 'empty' };
    },
    toast: () => {}
  });

  await manager.runForTesting();
  await manager.runTaggedForTesting();
  await manager.runAllUnderlinesForTesting();

  assert.deepEqual(calls, [
    { scope: 'color', color: '#5fb236' },
    { scope: 'tag', tagName: 'vocab' },
    { scope: 'all' }
  ]);
});

test('uses a candidate-color empty summary for the default color workflow', async () => {
  const toasts: string[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runForTesting();

  assert.equal(toasts[0], '초록 후보 색상 밑줄이 없습니다');
});

test('uses the selected color name in empty summaries', async () => {
  const toasts: string[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runColorForTesting('#a28ae5');

  assert.equal(toasts[0], '보라 후보 색상 밑줄이 없습니다');
});

test('uses a vocab-tag empty summary for the annotation tag workflow', async () => {
  const toasts: string[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTaggedForTesting();

  assert.equal(toasts[0], 'vocab 태그 밑줄이 없습니다');
});

test('keeps the generic empty summary for the all-underlines advanced workflow', async () => {
  const toasts: string[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runAllUnderlinesForTesting();

  assert.equal(toasts[0], '고급 전체 밑줄에서 검토할 단어 후보가 없습니다');
});

test('summarizes accepted candidate saves separately from empty items', async () => {
  const toasts: string[] = [];
  const accepted: number[] = [];
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [
        { id: 1, isRegularItem: () => true },
        { id: 2, isRegularItem: () => true }
      ]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    acceptCandidatesForItem: async (item: any) => {
      accepted.push(item.id);
      return item.id === 1 ? { status: 'accepted', wordCount: 2 } : { status: 'empty' };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runAcceptForTesting();

  assert.deepEqual(accepted, [1, 2]);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /1개 단어장 저장/);
  assert.match(toasts[0], /1개 후보 없음/);
});

test('asks for confirmation before accepting a large candidate set', async () => {
  const toasts: string[] = [];
  let accepted = false;
  const confirmations: Array<{ itemCount: number; wordCount: number }> = [];
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    countAcceptedCandidatesForItem: () => 40,
    confirmLargeAccept: (itemCount, wordCount) => {
      confirmations.push({ itemCount, wordCount });
      return false;
    },
    acceptCandidatesForItem: async () => {
      accepted = true;
      return { status: 'accepted', wordCount: 40 };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runAcceptForTesting();

  assert.deepEqual(confirmations, [{ itemCount: 1, wordCount: 40 }]);
  assert.equal(accepted, false);
  assert.equal(toasts[0], '단어장 저장을 취소했습니다');
});

test('does not ask for confirmation for a small candidate set', async () => {
  let confirmed = false;
  let accepted = false;
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    countAcceptedCandidatesForItem: () => 2,
    confirmLargeAccept: () => {
      confirmed = true;
      return false;
    },
    acceptCandidatesForItem: async () => {
      accepted = true;
      return { status: 'accepted', wordCount: 2 };
    },
    toast: () => {}
  });

  await manager.runAcceptForTesting();

  assert.equal(confirmed, false);
  assert.equal(accepted, true);
});

test('reports translation as disabled when no translation provider is configured', async () => {
  const toasts: string[] = [];
  let translated = false;
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    getTranslationProvider: () => 'off',
    translateMissingMeaningsForItem: async () => {
      translated = true;
      return { status: 'translated', translatedCount: 1 };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTranslateForTesting();

  assert.equal(translated, false);
  assert.match(toasts[0], /실험 번역 보조 기능 켜기/);
});

test('summarizes translated final vocab notes', async () => {
  const toasts: string[] = [];
  const translated: number[] = [];
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [
        { id: 1, isRegularItem: () => true },
        { id: 2, isRegularItem: () => true }
      ]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    getTranslationProvider: () => 'google-free',
    translateMissingMeaningsForItem: async (item: any) => {
      translated.push(item.id);
      return item.id === 1 ? { status: 'translated', translatedCount: 3 } : { status: 'empty' };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTranslateForTesting();

  assert.deepEqual(translated, [1, 2]);
  assert.match(toasts[0], /3개 뜻 채움/);
  assert.match(toasts[0], /1개 빈 뜻 없음/);
});

test('translates when the generated vocab note is selected', async () => {
  const toasts: string[] = [];
  const translated: number[] = [];
  const parent = { id: 7, isRegularItem: () => true };
  const generatedNote = {
    id: 99,
    parentID: 7,
    isRegularItem: () => false,
    getNote: () => '<section data-vocab-flow="words"><table></table></section>'
  };
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 7 ? parent : generatedNote) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [generatedNote]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    getTranslationProvider: () => 'google-free',
    confirmExternalTranslation: () => true,
    translateMissingMeaningsForItem: async (item: any) => {
      translated.push(item.id);
      return { status: 'translated', translatedCount: 1 };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTranslateForTesting();

  assert.deepEqual(translated, [7]);
  assert.equal(toasts[0], '1개 뜻 채움');
});

test('reports provider no-result separately from no blank meanings', async () => {
  const toasts: string[] = [];
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    getTranslationProvider: () => 'google-free',
    confirmExternalTranslation: () => true,
    translateMissingMeaningsForItem: async () => ({ status: 'untranslated', missingCount: 2 }),
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTranslateForTesting();

  assert.match(toasts[0], /2개 번역 결과 없음/);
  assert.doesNotMatch(toasts[0], /빈 뜻 없음/);
});

test('asks for confirmation before sending terms to an external translation provider', async () => {
  const toasts: string[] = [];
  let translated = false;
  let confirmedProvider: string | undefined;
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    getTranslationProvider: () => 'google-free',
    confirmExternalTranslation: (provider) => {
      confirmedProvider = provider;
      return false;
    },
    translateMissingMeaningsForItem: async () => {
      translated = true;
      return { status: 'translated', translatedCount: 1 };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTranslateForTesting();

  assert.equal(confirmedProvider, 'google-free');
  assert.equal(translated, false);
  assert.equal(toasts[0], '자동 번역을 취소했습니다');
});

test('asks for confirmation before translating a large selected set', async () => {
  const toasts: string[] = [];
  let translated = false;
  const confirmations: Array<{ itemCount: number; wordCount: number }> = [];
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => ({ id, isRegularItem: () => true }) },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    getTranslationProvider: () => 'google-free',
    confirmExternalTranslation: () => true,
    countMissingMeaningsForItem: () => 40,
    confirmLargeTranslation: (itemCount, wordCount) => {
      confirmations.push({ itemCount, wordCount });
      return false;
    },
    translateMissingMeaningsForItem: async () => {
      translated = true;
      return { status: 'translated', translatedCount: 40 };
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTranslateForTesting();

  assert.deepEqual(confirmations, [{ itemCount: 1, wordCount: 40 }]);
  assert.equal(translated, false);
  assert.equal(toasts[0], '자동 번역을 취소했습니다');
});
