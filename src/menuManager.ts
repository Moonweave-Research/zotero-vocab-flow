import { Logger } from './Logger';
import { AcceptResult, acceptCandidatesForItem } from './candidateAccepter';
import { countAcceptedCandidateLabels as defaultCandidateCounter } from './candidateNoteWriter';
import { DEFAULT_CANDIDATE_COLOR, DEFAULT_CANDIDATE_TAG, ReadUnderlineOptions, describeCandidateColor } from './annotationReader';
import { FillMeaningsResult, countMissingMeanings as defaultMissingMeaningCounter, fillMissingMeanings as defaultMeaningFiller } from './noteWriter';
import {
  OpenAICompatibleTranslationSettings,
  TranslationProvider,
  createTranslatorFromPrefs,
  getOpenAICompatibleTranslationSettings,
  setOpenAICompatibleTranslationPrefs,
  setTranslationProviderPref
} from './translator';
import { ExtractResult, extractForItem } from './vocabExtractor';
import { toast as defaultToast } from './notify';

const PLUGIN_ID = 'vocabflow@moon.com';
const MENU_ID = 'vocabflow-library-item-menu';
const LARGE_ACCEPT_THRESHOLD = 30;
const LARGE_TRANSLATION_THRESHOLD = 30;
const GENERATED_NOTE_MARKERS = [
  'data-vocab-flow="words"',
  'data-vocab-flow-candidates="review"'
];

interface MenuDeps {
  extractForItem: (item: any, options?: ReadUnderlineOptions) => Promise<ExtractResult>;
  acceptCandidatesForItem?: (item: any) => Promise<AcceptResult>;
  countAcceptedCandidatesForItem?: (item: any) => number;
  confirmLargeAccept?: (itemCount: number, wordCount: number) => boolean;
  getTranslationProvider?: () => TranslationProvider;
  setTranslationProvider?: (provider: TranslationProvider) => void;
  setOpenAICompatibleTranslationPrefs?: (settings: OpenAICompatibleTranslationSettings) => void;
  confirmEnableTranslation?: () => boolean;
  configureOpenAICompatibleTranslation?: () => OpenAICompatibleTranslationSettings | null;
  countMissingMeaningsForItem?: (item: any) => number;
  confirmExternalTranslation?: (provider: Exclude<TranslationProvider, 'off'>) => boolean;
  confirmLargeTranslation?: (itemCount: number, wordCount: number) => boolean;
  translateMissingMeaningsForItem?: (item: any) => Promise<FillMeaningsResult>;
  toast: (message: string) => void;
}

const DEFAULT_DEPS: MenuDeps = {
  extractForItem: (item: any, options?: ReadUnderlineOptions) => extractForItem(item, undefined, { notify: false, ...options }),
  acceptCandidatesForItem: (item: any) => acceptCandidatesForItem(item, undefined, { notify: false }),
  countAcceptedCandidatesForItem: defaultCandidateCounter,
  confirmLargeAccept: confirmLargeAccept,
  getTranslationProvider: () => createTranslatorFromPrefs().provider,
  setTranslationProvider: setTranslationProviderPref,
  setOpenAICompatibleTranslationPrefs: setOpenAICompatibleTranslationPrefs,
  confirmEnableTranslation: confirmEnableTranslation,
  configureOpenAICompatibleTranslation: configureOpenAICompatibleTranslation,
  countMissingMeaningsForItem: defaultMissingMeaningCounter,
  confirmExternalTranslation: confirmExternalTranslation,
  confirmLargeTranslation: confirmLargeTranslation,
  translateMissingMeaningsForItem: (item: any) => {
    const translator = createTranslatorFromPrefs();
    return defaultMeaningFiller(item, (words) => translator.translate(words));
  },
  toast: defaultToast
};

const CANDIDATE_COLORS = [
  { l10nID: 'vocab-flow-extract-green', label: '초록 밑줄에서 term candidates 만들기...', color: DEFAULT_CANDIDATE_COLOR },
  { l10nID: 'vocab-flow-extract-yellow', label: '노란 밑줄에서 term candidates 만들기...', color: '#ffd400' },
  { l10nID: 'vocab-flow-extract-blue', label: '파란 밑줄에서 term candidates 만들기...', color: '#2ea8e5' },
  { l10nID: 'vocab-flow-extract-purple', label: '보라 밑줄에서 term candidates 만들기...', color: '#a28ae5' },
  { l10nID: 'vocab-flow-extract-red', label: '빨간 밑줄에서 term candidates 만들기...', color: '#ff6666' },
  { l10nID: 'vocab-flow-extract-gray', label: '회색 밑줄에서 term candidates 만들기...', color: '#aaaaaa' }
];

export class VocabFlowMenuManager {
  private registeredMenuID: string | false | null = null;

  constructor(private deps: MenuDeps = DEFAULT_DEPS) {}

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
            ...CANDIDATE_COLORS.map((entry) => ({
              menuType: 'menuitem',
              l10nID: entry.l10nID,
              label: entry.label,
              onCommand: (_event: Event, context: any) => this.handleCommand('extract', () => this.runExtract(context, { scope: 'color', color: entry.color }))
            })),
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-extract-tag',
                label: 'vocab 태그 밑줄에서 term candidates 만들기...',
                onCommand: (_event: Event, context: any) => this.handleCommand('extract', () => this.runExtract(context, { scope: 'tag', tagName: DEFAULT_CANDIDATE_TAG }))
              },
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-extract-all',
                label: '고급: 모든 밑줄에서 term candidates 만들기...',
                onCommand: (_event: Event, context: any) => this.handleCommand('extract', () => this.runExtract(context, { scope: 'all' }))
              },
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-accept',
                label: 'selected candidates로 단어장 만들기',
                onCommand: (_event: Event, context: any) => this.handleCommand('accept', () => this.runAccept(context))
              },
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-translate',
                label: '빈 Korean meanings 채우기...',
                onCommand: (_event: Event, context: any) => this.handleCommand('translate', () => this.runTranslate(context))
              },
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-translation-enable-google-free',
                label: '부정확할 수 있는 무료 번역 보조 기능 켜기...',
                onCommand: () => this.handleCommand('translation-enable', () => this.runEnableGoogleFreeTranslation())
              },
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-translation-configure-openai-compatible',
                label: 'OpenAI-compatible BYO API 설정...',
                onCommand: () => this.handleCommand('translation-configure', () => this.runConfigureOpenAICompatibleTranslation())
              },
              {
                menuType: 'menuitem',
                l10nID: 'vocab-flow-translation-disable',
                label: '번역 보조 기능 끄기',
                onCommand: () => this.handleCommand('translation-disable', () => this.runDisableTranslation())
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

  public async runForTesting(context?: any) {
    await this.runExtract(context, { scope: 'color', color: DEFAULT_CANDIDATE_COLOR });
  }

  public async runColorForTesting(color: string, context?: any) {
    await this.runExtract(context, { scope: 'color', color });
  }

  public async runTaggedForTesting(context?: any) {
    await this.runExtract(context, { scope: 'tag', tagName: DEFAULT_CANDIDATE_TAG });
  }

  public async runAllUnderlinesForTesting(context?: any) {
    await this.runExtract(context, { scope: 'all' });
  }

  public async runAcceptForTesting(context?: any) {
    await this.runAccept(context);
  }

  public async runTranslateForTesting(context?: any) {
    await this.runTranslate(context);
  }

  public async runEnableGoogleFreeTranslationForTesting() {
    await this.runEnableGoogleFreeTranslation();
  }

  public async runConfigureOpenAICompatibleTranslationForTesting() {
    await this.runConfigureOpenAICompatibleTranslation();
  }

  public async runDisableTranslationForTesting() {
    await this.runDisableTranslation();
  }

  private handleCommand(name: 'extract' | 'accept' | 'translate' | 'translation-enable' | 'translation-configure' | 'translation-disable', run: () => Promise<void>) {
    Logger.log(`menu command received: ${name}`);
    return run().catch((e) => Logger.error(`menu command failed: ${name}`, e));
  }

  private async runExtract(context: any, options: ReadUnderlineOptions) {
    const items = this.getRegularItems(context);
    Logger.log(`extract command selected ${items.length} item(s)`);
    if (!items.length) return;

    let pdfMissing = 0;
    let candidates = 0;
    let empty = 0;
    let failed = 0;
    for (const item of items) {
      try {
        if (!(item.getAttachments?.() ?? []).some((id: number) => Zotero.Items.get(id)?.isPDFAttachment?.())) {
          pdfMissing++;
          continue;
        }
        const result = await this.deps.extractForItem(item, options);
        if (result.status === 'candidates') candidates++;
        if (result.status === 'empty') empty++;
      } catch (e) {
        Logger.error(`vocab extract failed for item ${item?.id}`, e);
        failed++;
      }
    }
    this.deps.toast(summarizeResult({ total: items.length, candidates, empty, pdfMissing, failed, options }));
  }

  private async runAccept(context?: any) {
    const items = this.getRegularItems(context);
    Logger.log(`accept command selected ${items.length} item(s)`);
    if (!items.length) return;

    let accepted = 0;
    let empty = 0;
    let failed = 0;
    const accept = this.deps.acceptCandidatesForItem ?? DEFAULT_DEPS.acceptCandidatesForItem;
    const countAccepted = this.deps.countAcceptedCandidatesForItem ?? DEFAULT_DEPS.countAcceptedCandidatesForItem;
    const wordCount = items.reduce((sum, item) => sum + countAccepted!(item), 0);
    if (wordCount >= LARGE_ACCEPT_THRESHOLD) {
      const confirm = this.deps.confirmLargeAccept ?? DEFAULT_DEPS.confirmLargeAccept;
      if (!confirm!(items.length, wordCount)) {
        this.deps.toast('단어장 저장을 취소했습니다');
        return;
      }
    }

    for (const item of items) {
      try {
        const result = await accept!(item);
        if (result.status === 'accepted') accepted++;
        if (result.status === 'empty') empty++;
      } catch (e) {
        Logger.error(`vocab accept failed for item ${item?.id}`, e);
        failed++;
      }
    }
    this.deps.toast(summarizeAcceptResult({ total: items.length, accepted, empty, failed }));
  }

  private async runTranslate(context?: any) {
    const items = this.getRegularItems(context);
    Logger.log(`translate command selected ${items.length} item(s)`);
    if (!items.length) return;

    const provider = (this.deps.getTranslationProvider ?? DEFAULT_DEPS.getTranslationProvider)!();
    if (provider === 'off') {
      this.deps.toast('번역 보조 기능이 꺼져 있습니다. Vocab Flow에서 무료 번역 보조 기능을 켜거나 OpenAI-compatible BYO API를 설정하세요');
      return;
    }
    const confirmExternal = this.deps.confirmExternalTranslation ?? DEFAULT_DEPS.confirmExternalTranslation;
    if (!confirmExternal!(provider)) {
      this.deps.toast('자동 번역을 취소했습니다');
      return;
    }

    const countMissing = this.deps.countMissingMeaningsForItem ?? DEFAULT_DEPS.countMissingMeaningsForItem;
    const wordCount = items.reduce((sum, item) => sum + countMissing!(item), 0);
    if (wordCount >= LARGE_TRANSLATION_THRESHOLD) {
      const confirmLarge = this.deps.confirmLargeTranslation ?? DEFAULT_DEPS.confirmLargeTranslation;
      if (!confirmLarge!(items.length, wordCount)) {
        this.deps.toast('자동 번역을 취소했습니다');
        return;
      }
    }

    let translated = 0;
    let empty = 0;
    let untranslated = 0;
    let failed = 0;
    const fill = this.deps.translateMissingMeaningsForItem ?? DEFAULT_DEPS.translateMissingMeaningsForItem;
    for (const item of items) {
      try {
        const result = await fill!(item);
        if (result.status === 'translated') translated += result.translatedCount;
        if (result.status === 'untranslated') untranslated += result.missingCount;
        if (result.status === 'empty') empty++;
      } catch (e) {
        Logger.error(`vocab translation failed for item ${item?.id}`, e);
        failed++;
      }
    }
    this.deps.toast(summarizeTranslateResult({ translated, empty, untranslated, failed }));
  }

  private async runEnableGoogleFreeTranslation() {
    const confirm = this.deps.confirmEnableTranslation ?? DEFAULT_DEPS.confirmEnableTranslation;
    if (!confirm!()) {
      this.deps.toast('부정확할 수 있는 무료 번역 보조 기능 설정을 취소했습니다');
      return;
    }
    const setProvider = this.deps.setTranslationProvider ?? DEFAULT_DEPS.setTranslationProvider;
    setProvider!('google-free');
    this.deps.toast('부정확할 수 있는 무료 번역 보조 기능을 켰습니다');
  }

  private async runConfigureOpenAICompatibleTranslation() {
    const configure = this.deps.configureOpenAICompatibleTranslation ?? DEFAULT_DEPS.configureOpenAICompatibleTranslation;
    const settings = configure!();
    if (!settings) {
      this.deps.toast('OpenAI-compatible BYO API 설정을 취소했습니다');
      return;
    }
    const setPrefs = this.deps.setOpenAICompatibleTranslationPrefs ?? DEFAULT_DEPS.setOpenAICompatibleTranslationPrefs;
    setPrefs!(settings);
    this.deps.toast(settings.sendContext
      ? 'OpenAI-compatible BYO API를 켰습니다. 번역 시 밑줄 문맥을 함께 전송합니다'
      : 'OpenAI-compatible BYO API를 켰습니다. 번역 시 용어만 전송합니다');
  }

  private async runDisableTranslation() {
    const setProvider = this.deps.setTranslationProvider ?? DEFAULT_DEPS.setTranslationProvider;
    setProvider!('off');
    this.deps.toast('번역 보조 기능을 껐습니다');
  }

  private getRegularItems(context?: any): any[] {
    const contextItems = Array.isArray(context?.items) ? context.items : [];
    const normalized = this.resolveRegularItems(contextItems);
    if (normalized.length) return normalized;

    const pane = Zotero.getActiveZoteroPane?.();
    const selected = pane?.getSelectedItems?.() ?? [];
    return this.resolveRegularItems(selected);
  }

  private resolveRegularItems(items: any[]): any[] {
    const resolved: any[] = [];
    const seen = new Set<number>();
    for (const item of items) {
      const regular = this.resolveRegularItem(item);
      if (!regular?.isRegularItem?.()) continue;
      if (typeof regular.id === 'number') {
        if (seen.has(regular.id)) continue;
        seen.add(regular.id);
      }
      resolved.push(regular);
    }
    return resolved;
  }

  private resolveRegularItem(item: any): any | null {
    if (item?.isRegularItem?.()) return item;
    const loaded = typeof item?.id === 'number' ? Zotero.Items.get(item.id) ?? item : item;
    if (loaded?.isRegularItem?.()) return loaded;
    if (!isGeneratedVocabFlowNote(loaded)) return null;
    const parentID = loaded?.parentID;
    if (typeof parentID !== 'number') return null;
    const parent = Zotero.Items.get(parentID);
    return parent?.isRegularItem?.() ? parent : null;
  }
}

function isGeneratedVocabFlowNote(item: any): boolean {
  const html = item?.getNote?.() ?? item?.note ?? '';
  return GENERATED_NOTE_MARKERS.some((marker) => html.includes(marker));
}

function summarizeResult(result: { total: number; candidates: number; empty: number; pdfMissing: number; failed: number; options: ReadUnderlineOptions }): string {
  if (result.pdfMissing === result.total) return '이 항목에 PDF가 없습니다';
  if (result.empty === result.total) {
    if (result.options.scope === 'color') return `${describeCandidateColor(result.options.color)} 밑줄이 없습니다`;
    if (result.options.scope === 'tag') return `${result.options.tagName ?? DEFAULT_CANDIDATE_TAG} 태그 밑줄이 없습니다`;
    return '고급 전체 밑줄에서 검토할 단어 후보가 없습니다';
  }
  if (result.failed === result.total) return '단어 추출 중 오류가 발생했습니다';

  const parts: string[] = [];
  if (result.candidates) parts.push(`${result.candidates}개 후보 노트 저장`);
  if (result.empty) parts.push(`${result.empty}개 후보 없음`);
  if (result.pdfMissing) parts.push(`${result.pdfMissing}개 PDF 없음`);
  if (result.failed) parts.push(`${result.failed}개 실패`);
  return parts.length ? parts.join(', ') : '처리할 항목이 없습니다';
}

function summarizeAcceptResult(result: { total: number; accepted: number; empty: number; failed: number }): string {
  if (result.empty === result.total) return '확정할 단어 후보가 없습니다';
  if (result.failed === result.total) return '단어장 저장 중 오류가 발생했습니다';

  const parts: string[] = [];
  if (result.accepted) parts.push(`${result.accepted}개 단어장 저장`);
  if (result.empty) parts.push(`${result.empty}개 후보 없음`);
  if (result.failed) parts.push(`${result.failed}개 실패`);
  return parts.length ? parts.join(', ') : '처리할 항목이 없습니다';
}

function summarizeTranslateResult(result: { translated: number; empty: number; untranslated: number; failed: number }): string {
  if (!result.translated && result.empty && !result.untranslated && !result.failed) return '채울 빈 한국어 뜻이 없습니다';
  if (!result.translated && result.failed && !result.empty && !result.untranslated) return '자동 번역 중 오류가 발생했습니다';

  const parts: string[] = [];
  if (result.translated) parts.push(`${result.translated}개 뜻 채움`);
  if (result.empty) parts.push(`${result.empty}개 빈 뜻 없음`);
  if (result.untranslated) parts.push(`${result.untranslated}개 번역 결과 없음`);
  if (result.failed) parts.push(`${result.failed}개 실패`);
  return parts.length ? parts.join(', ') : '처리할 항목이 없습니다';
}

function confirmLargeAccept(itemCount: number, wordCount: number): boolean {
  const message = itemCount === 1
    ? `${wordCount}개 후보를 최종 단어장으로 저장할까요?`
    : `${itemCount}개 항목의 ${wordCount}개 후보를 최종 단어장으로 저장할까요?`;
  const win = Zotero.getMainWindow?.();
  if (typeof win?.confirm === 'function') return win.confirm(message);
  if (typeof globalThis.confirm === 'function') return globalThis.confirm(message);
  return true;
}

function confirmExternalTranslation(provider: Exclude<TranslationProvider, 'off'>): boolean {
  const message = provider === 'openai-compatible' && getOpenAICompatibleTranslationSettings().sendContext
    ? 'OpenAI-compatible BYO API 자동 번역은 빈 영어 단어/구와 저장된 밑줄 문맥을 사용자가 설정한 외부 API로 전송합니다. 계속할까요?'
    : `${provider} 자동 번역은 빈 영어 단어/구를 외부 번역 서비스로 전송합니다. 계속할까요?`;
  const win = Zotero.getMainWindow?.();
  if (typeof win?.confirm === 'function') return win.confirm(message);
  if (typeof globalThis.confirm === 'function') return globalThis.confirm(message);
  return true;
}

function confirmEnableTranslation(): boolean {
  const message = '부정확할 수 있는 무료 번역 보조 기능을 켜면 영어 단어/구가 문맥 없이 외부 Google Translate 엔드포인트로 전송될 수 있습니다. 연구 용어 번역 품질, 안정성, 속도, 한도는 보장되지 않습니다. 직접 검토할 때만 사용하세요. 계속할까요?';
  const win = Zotero.getMainWindow?.();
  if (typeof win?.confirm === 'function') return win.confirm(message);
  if (typeof globalThis.confirm === 'function') return globalThis.confirm(message);
  return true;
}

function configureOpenAICompatibleTranslation(): OpenAICompatibleTranslationSettings | null {
  const win = Zotero.getMainWindow?.();
  const confirmFn = typeof win?.confirm === 'function' ? win.confirm.bind(win) : globalThis.confirm?.bind(globalThis);
  const promptFn = typeof win?.prompt === 'function' ? win.prompt.bind(win) : globalThis.prompt?.bind(globalThis);
  if (confirmFn && !confirmFn('OpenAI-compatible BYO API를 설정하면 API key가 Zotero preference에 저장되고, 번역 실행 시 용어가 외부 API로 전송됩니다. 문맥 전송은 다음 단계에서 선택합니다. 계속할까요?')) return null;
  if (!promptFn) return null;

  const current = getOpenAICompatibleTranslationSettings();
  const endpoint = promptFn('Chat Completions 호환 endpoint URL', current.endpoint);
  if (!endpoint?.trim()) return null;
  const model = promptFn('사용할 model 이름', current.model);
  if (!model?.trim()) return null;
  const apiKey = promptFn('API key', current.apiKey);
  if (!apiKey?.trim()) return null;
  const sendContext = confirmFn
    ? confirmFn('번역 품질을 위해 저장된 밑줄 문맥도 외부 API로 전송할까요? 취소하면 용어만 전송합니다.')
    : false;

  return {
    endpoint,
    apiKey,
    model,
    sendContext
  };
}

function confirmLargeTranslation(itemCount: number, wordCount: number): boolean {
  const message = itemCount === 1
    ? `${wordCount}개 빈 뜻을 자동 번역할까요?`
    : `${itemCount}개 항목의 ${wordCount}개 빈 뜻을 자동 번역할까요?`;
  const win = Zotero.getMainWindow?.();
  if (typeof win?.confirm === 'function') return win.confirm(message);
  if (typeof globalThis.confirm === 'function') return globalThis.confirm(message);
  return true;
}
