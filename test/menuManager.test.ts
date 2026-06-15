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
  assert.ok(l10nIDs.includes('vocab-flow-translation-configure-openai-compatible'));
  assert.ok(l10nIDs.includes('vocab-flow-translation-disable'));
  const labels = registered.menus[0].menus.map((menu: any) => menu.label);
  assert.ok(labels.includes('부정확할 수 있는 무료 번역 보조 기능 켜기...'));
  assert.ok(labels.includes('OpenAI-compatible BYO API 설정...'));
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
  assert.equal(toasts[0], '부정확할 수 있는 무료 번역 보조 기능을 켰습니다');
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
  assert.equal(toasts[0], '부정확할 수 있는 무료 번역 보조 기능 설정을 취소했습니다');
});

test('configures OpenAI-compatible BYO API translation through the menu', async () => {
  const toasts: string[] = [];
  const settings = {
    endpoint: 'https://llm.example.test/v1/chat/completions',
    apiKey: 'sk-test',
    model: 'research-translator',
    sendContext: true
  };
  const saved: unknown[] = [];
  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    configureOpenAICompatibleTranslation: () => settings,
    setOpenAICompatibleTranslationPrefs: (value) => {
      saved.push(value);
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runConfigureOpenAICompatibleTranslationForTesting();

  assert.deepEqual(saved, [settings]);
  assert.equal(toasts[0], 'OpenAI-compatible BYO API를 켰습니다. 번역 시 밑줄 문맥을 함께 전송합니다');
});

test('does not configure OpenAI-compatible BYO API when setup is canceled', async () => {
  const toasts: string[] = [];
  const saved: unknown[] = [];
  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty' }),
    configureOpenAICompatibleTranslation: () => null,
    setOpenAICompatibleTranslationPrefs: (value) => {
      saved.push(value);
    },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runConfigureOpenAICompatibleTranslationForTesting();

  assert.deepEqual(saved, []);
  assert.equal(toasts[0], 'OpenAI-compatible BYO API 설정을 취소했습니다');
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

test('reports when no Zotero item is selected for extraction', async () => {
  const toasts: string[] = [];
  (globalThis as any).Zotero = {
    Items: { get: () => null },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => []
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'empty', annotationCount: 0, cleanedCandidateNote: false }),
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTaggedForTesting();

  assert.equal(toasts[0], '선택된 Zotero 항목이 없습니다');
});

test('selects the generated candidate note after successful extraction', async () => {
  const shown: number[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => ({ status: 'candidates', candidateCount: 5, annotationCount: 2, noteID: 99 }),
    showGeneratedNote: (noteID: number) => { shown.push(noteID); },
    toast: () => {}
  });

  await manager.runTaggedForTesting();

  assert.deepEqual(shown, [99]);
});

test('default generated-note selector uses Zotero pane fallbacks', async () => {
  const pdfAttachment = { isPDFAttachment: () => true };
  const selectedItem = { id: 1, isRegularItem: () => true, getAttachments: () => [10] };
  const cases = [
    {
      pane: (shown: number[]) => ({
        getSelectedItems: () => [selectedItem],
        selectItem: (noteID: number) => { shown.push(noteID); }
      }),
      mainWindow: undefined
    },
    {
      pane: (shown: number[]) => ({
        getSelectedItems: () => [selectedItem],
        itemsView: { selectItem: (noteID: number) => { shown.push(noteID); } }
      }),
      mainWindow: undefined
    },
    {
      pane: (shown: number[]) => ({
        getSelectedItems: () => [selectedItem],
        itemTree: { selectItem: (noteID: number) => { shown.push(noteID); } }
      }),
      mainWindow: undefined
    },
    {
      pane: (_shown: number[]) => ({
        getSelectedItems: () => [selectedItem]
      }),
      mainWindow: (shown: number[]) => ({
        ZoteroPane: { selectItem: (noteID: number) => { shown.push(noteID); } }
      })
    }
  ];

  for (const fallbackCase of cases) {
    const shown: number[] = [];
    (globalThis as any).Zotero = {
      Items: { get: () => pdfAttachment },
      getActiveZoteroPane: () => fallbackCase.pane(shown),
      getMainWindow: () => fallbackCase.mainWindow?.(shown)
    };
    const manager = new VocabFlowMenuManager({
      extractForItem: async () => ({ status: 'candidates', candidateCount: 5, annotationCount: 2, noteID: 99 }),
      toast: () => {}
    });

    await manager.runTaggedForTesting();

    assert.deepEqual(shown, [99]);
  }
});

test('reports item-level extraction failures with the error reason', async () => {
  const toasts: string[] = [];
  const pdfAttachment = { isPDFAttachment: () => true };
  (globalThis as any).Zotero = {
    Items: { get: () => pdfAttachment },
    getActiveZoteroPane: () => ({
      getSelectedItems: () => [{ id: 1, isRegularItem: () => true, getAttachments: () => [10] }]
    })
  };

  const manager = new VocabFlowMenuManager({
    extractForItem: async () => { throw new Error('DB write failed'); },
    toast: (message: string) => { toasts.push(message); }
  });

  await manager.runTaggedForTesting();

  assert.match(toasts[0], /단어 추출 중 오류가 발생했습니다/);
  assert.match(toasts[0], /DB write failed/);
});

test('command handler reports unexpected command failures to the user', async () => {
  const toasts: string[] = [];
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
    extractForItem: async () => ({ status: 'empty', annotationCount: 0, cleanedCandidateNote: false }),
    setTranslationProvider: () => { throw new Error('preference store unavailable'); },
    toast: (message: string) => { toasts.push(message); }
  });
  manager.register();

  const disableMenu = registered.menus[0].menus.find((menu: any) => menu.l10nID === 'vocab-flow-translation-disable');
  await disableMenu.onCommand();

  assert.match(toasts[0], /Vocab Flow 명령 실행 실패/);
  assert.match(toasts[0], /preference store unavailable/);
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
  assert.match(toasts[0], /BYO API를 설정/);
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

test('translates when a Zotero-sanitized generated vocab note is selected', async () => {
  const toasts: string[] = [];
  const translated: number[] = [];
  const parent = { id: 7, isRegularItem: () => true };
  const generatedNote = {
    id: 99,
    parentID: 7,
    isRegularItem: () => false,
    getNote: () => [
      '<div data-schema-version="9">',
      '<h2>단어장 (1) - Vocab Flow Wordbook</h2>',
      '<table><tbody><tr><td><p>LCE matrix</p></td><td><p></p></td></tr></tbody></table>',
      '</div>'
    ].join('')
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
