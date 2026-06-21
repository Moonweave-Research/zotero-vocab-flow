import {
  GoogleFreeFailureReason,
  getCachedFreeTranslation,
  hasFreshGoogleFreeFailure,
  loadGoogleFreeTranslationCache,
  normalizeFreeTranslationKey,
  rememberGoogleFreeFailure,
  rememberGoogleFreeTranslation,
  saveGoogleFreeTranslationCache
} from './freeTranslationMemory';

export type TranslationProvider = 'off' | 'google-free' | 'openai-compatible' | 'gemini' | 'anthropic';

export interface TranslationInput {
  word: string;
  sourceText?: string;
  sourceIndex?: number;
}

export type TranslationInputLike = string | TranslationInput;

export interface Translator {
  provider: TranslationProvider;
  translate(words: TranslationInputLike[]): Promise<Map<string, string>>;
}

const PROVIDER_PREF = 'extensions.vocabflow.translation.provider';
const OPENAI_ENDPOINT_PREF = 'extensions.vocabflow.translation.openai.endpoint';
const OPENAI_API_KEY_PREF = 'extensions.vocabflow.translation.openai.apiKey';
const OPENAI_MODEL_PREF = 'extensions.vocabflow.translation.openai.model';
const OPENAI_SEND_CONTEXT_PREF = 'extensions.vocabflow.translation.openai.sendContext';
const GEMINI_ENDPOINT_PREF = 'extensions.vocabflow.translation.gemini.endpoint';
const GEMINI_API_KEY_PREF = 'extensions.vocabflow.translation.gemini.apiKey';
const GEMINI_MODEL_PREF = 'extensions.vocabflow.translation.gemini.model';
const GEMINI_SEND_CONTEXT_PREF = 'extensions.vocabflow.translation.gemini.sendContext';
const ANTHROPIC_ENDPOINT_PREF = 'extensions.vocabflow.translation.anthropic.endpoint';
const ANTHROPIC_API_KEY_PREF = 'extensions.vocabflow.translation.anthropic.apiKey';
const ANTHROPIC_MODEL_PREF = 'extensions.vocabflow.translation.anthropic.model';
const ANTHROPIC_SEND_CONTEXT_PREF = 'extensions.vocabflow.translation.anthropic.sendContext';
const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 8000;
const TRANSLATION_SYSTEM_PROMPT = 'Translate academic vocabulary into concise Korean meanings. Return only a JSON object mapping each exact input term to its Korean meaning. Do not add extra keys.';

export interface OpenAICompatibleTranslationSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  sendContext: boolean;
}

export interface GeminiTranslationSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  sendContext: boolean;
}

export interface AnthropicTranslationSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  sendContext: boolean;
}

export function setTranslationProviderPref(provider: TranslationProvider): void {
  Zotero.Prefs?.set?.(PROVIDER_PREF, provider);
}

export function setOpenAICompatibleTranslationPrefs(settings: OpenAICompatibleTranslationSettings): void {
  Zotero.Prefs?.set?.(OPENAI_ENDPOINT_PREF, settings.endpoint.trim());
  Zotero.Prefs?.set?.(OPENAI_API_KEY_PREF, settings.apiKey.trim());
  Zotero.Prefs?.set?.(OPENAI_MODEL_PREF, settings.model.trim());
  Zotero.Prefs?.set?.(OPENAI_SEND_CONTEXT_PREF, settings.sendContext);
  setTranslationProviderPref('openai-compatible');
}

export function setGeminiTranslationPrefs(settings: GeminiTranslationSettings): void {
  Zotero.Prefs?.set?.(GEMINI_ENDPOINT_PREF, settings.endpoint.trim());
  Zotero.Prefs?.set?.(GEMINI_API_KEY_PREF, settings.apiKey.trim());
  Zotero.Prefs?.set?.(GEMINI_MODEL_PREF, settings.model.trim());
  Zotero.Prefs?.set?.(GEMINI_SEND_CONTEXT_PREF, settings.sendContext);
  setTranslationProviderPref('gemini');
}

export function setAnthropicTranslationPrefs(settings: AnthropicTranslationSettings): void {
  Zotero.Prefs?.set?.(ANTHROPIC_ENDPOINT_PREF, settings.endpoint.trim());
  Zotero.Prefs?.set?.(ANTHROPIC_API_KEY_PREF, settings.apiKey.trim());
  Zotero.Prefs?.set?.(ANTHROPIC_MODEL_PREF, settings.model.trim());
  Zotero.Prefs?.set?.(ANTHROPIC_SEND_CONTEXT_PREF, settings.sendContext);
  setTranslationProviderPref('anthropic');
}

export function getOpenAICompatibleTranslationSettings(): OpenAICompatibleTranslationSettings {
  return {
    endpoint: stringPref(OPENAI_ENDPOINT_PREF, DEFAULT_OPENAI_ENDPOINT),
    apiKey: stringPref(OPENAI_API_KEY_PREF, ''),
    model: stringPref(OPENAI_MODEL_PREF, ''),
    sendContext: booleanPref(OPENAI_SEND_CONTEXT_PREF, false)
  };
}

export function getGeminiTranslationSettings(): GeminiTranslationSettings {
  return {
    endpoint: stringPref(GEMINI_ENDPOINT_PREF, DEFAULT_GEMINI_ENDPOINT),
    apiKey: stringPref(GEMINI_API_KEY_PREF, ''),
    model: stringPref(GEMINI_MODEL_PREF, ''),
    sendContext: booleanPref(GEMINI_SEND_CONTEXT_PREF, false)
  };
}

export function getAnthropicTranslationSettings(): AnthropicTranslationSettings {
  return {
    endpoint: stringPref(ANTHROPIC_ENDPOINT_PREF, DEFAULT_ANTHROPIC_ENDPOINT),
    apiKey: stringPref(ANTHROPIC_API_KEY_PREF, ''),
    model: stringPref(ANTHROPIC_MODEL_PREF, ''),
    sendContext: booleanPref(ANTHROPIC_SEND_CONTEXT_PREF, false)
  };
}

export function createTranslatorFromPrefs(): Translator {
  const provider = normalizeProvider(Zotero.Prefs?.get?.(PROVIDER_PREF));
  if (provider === 'google-free') return new GoogleFreeTranslator();
  if (provider === 'openai-compatible') return new OpenAICompatibleTranslator(getOpenAICompatibleTranslationSettings());
  if (provider === 'gemini') return new GeminiTranslator(getGeminiTranslationSettings());
  if (provider === 'anthropic') return new AnthropicTranslator(getAnthropicTranslationSettings());
  return new OffTranslator();
}

class OffTranslator implements Translator {
  provider: TranslationProvider = 'off';

  async translate(): Promise<Map<string, string>> {
    return new Map();
  }
}

class GoogleFreeTranslator implements Translator {
  provider: TranslationProvider = 'google-free';

  async translate(words: TranslationInputLike[]): Promise<Map<string, string>> {
    const translations = new Map<string, string>();
    const seen = new Set<string>();
    const cache = loadGoogleFreeTranslationCache();
    const now = Date.now();
    for (const input of normalizeTranslationInputs(words)) {
      const key = normalizeFreeTranslationKey(input.word);
      if (!key) continue;
      const cached = getCachedFreeTranslation(cache, input.word, now);
      if (cached) {
        translations.set(input.word, cached);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      if (hasFreshGoogleFreeFailure(cache, input.word, now)) continue;
      try {
        const translated = await translateWithGoogleFree(input.word);
        if (!translated) {
          rememberGoogleFreeFailure(cache, input.word, 'empty', now);
          continue;
        }
        if (rememberGoogleFreeTranslation(cache, input.word, translated, now)) {
          translations.set(input.word, translated);
        } else {
          rememberGoogleFreeFailure(cache, input.word, 'rejected', now);
        }
      } catch (e) {
        rememberGoogleFreeFailure(cache, input.word, googleFreeFailureReason(e), now);
        // Keep partial results; one blocked/rate-limited term should not discard earlier meanings.
      }
    }
    saveGoogleFreeTranslationCache(cache, now);
    return translations;
  }
}

class OpenAICompatibleTranslator implements Translator {
  provider: TranslationProvider = 'openai-compatible';

  constructor(private settings: OpenAICompatibleTranslationSettings) {}

  async translate(words: TranslationInputLike[]): Promise<Map<string, string>> {
    const inputs = normalizeTranslationInputs(words);
    if (!inputs.length || !this.settings.apiKey || !this.settings.model || !this.settings.endpoint) return new Map();

    const response = await fetchWithTimeout(this.settings.endpoint, REQUEST_TIMEOUT_MS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.settings.model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: TRANSLATION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: buildTranslationPrompt(inputs, this.settings.sendContext)
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`openai-compatible translation request failed: ${response.status}`);

    const json = await response.json();
    const content = String(json?.choices?.[0]?.message?.content ?? '').trim();
    return parseTranslationObject(content, inputs);
  }
}

class GeminiTranslator implements Translator {
  provider: TranslationProvider = 'gemini';

  constructor(private settings: GeminiTranslationSettings) {}

  async translate(words: TranslationInputLike[]): Promise<Map<string, string>> {
    const inputs = normalizeTranslationInputs(words);
    if (!inputs.length || !this.settings.apiKey || !this.settings.model || !this.settings.endpoint) return new Map();

    const response = await fetchWithTimeout(buildGeminiURL(this.settings), REQUEST_TIMEOUT_MS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: TRANSLATION_SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildTranslationPrompt(inputs, this.settings.sendContext) }]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!response.ok) throw new Error(`gemini translation request failed: ${response.status}`);

    const json = await response.json();
    const content = extractGeminiText(json);
    return parseTranslationObject(content, inputs);
  }
}

class AnthropicTranslator implements Translator {
  provider: TranslationProvider = 'anthropic';

  constructor(private settings: AnthropicTranslationSettings) {}

  async translate(words: TranslationInputLike[]): Promise<Map<string, string>> {
    const inputs = normalizeTranslationInputs(words);
    if (!inputs.length || !this.settings.apiKey || !this.settings.model || !this.settings.endpoint) return new Map();

    const response = await fetchWithTimeout(this.settings.endpoint, REQUEST_TIMEOUT_MS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.settings.model,
        max_tokens: 1000,
        temperature: 0,
        system: TRANSLATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildTranslationPrompt(inputs, this.settings.sendContext)
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`anthropic translation request failed: ${response.status}`);

    const json = await response.json();
    const content = extractAnthropicText(json);
    return parseTranslationObject(content, inputs);
  }
}

function normalizeTranslationInputs(inputs: TranslationInputLike[]): TranslationInput[] {
  return inputs.map((input) => typeof input === 'string' ? { word: input } : input);
}

function buildTranslationPrompt(inputs: TranslationInput[], sendContext: boolean): string {
  const payload = inputs.map((input) => {
    if (!sendContext || !input.sourceText) return { term: input.word };
    return { term: input.word, context: input.sourceText };
  });
  return [
    'Translate these terms to Korean meanings for a vocabulary table.',
    'Return JSON only.',
    JSON.stringify(payload)
  ].join('\n');
}

function buildGeminiURL(settings: GeminiTranslationSettings): string {
  const endpoint = settings.endpoint.trim().replace(/\/$/, '');
  const model = settings.model.trim().replace(/^models\//, '');
  return `${endpoint}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey.trim())}`;
}

function extractGeminiText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('').trim();
}

function extractAnthropicText(json: any): string {
  const blocks = json?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks.map((block: any) => typeof block?.text === 'string' ? block.text : '').join('').trim();
}

function parseTranslationObject(content: string, inputs: TranslationInput[]): Map<string, string> {
  const translations = new Map<string, string>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(content));
  } catch (_e) {
    return translations;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return translations;

  const allowed = new Set(inputs.map((input) => input.word));
  for (const [key, value] of Object.entries(parsed)) {
    if (!allowed.has(key) || typeof value !== 'string') continue;
    const translated = value.trim();
    if (translated) translations.set(key, translated);
  }
  return translations;
}

function stripJsonFence(content: string): string {
  const fenced = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : content;
}

async function translateWithGoogleFree(word: string): Promise<string> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'ko',
    dt: 't',
    q: word
  });
  const response = await fetchWithTimeout(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, REQUEST_TIMEOUT_MS);
  if (!response.ok) throw new GoogleFreeRequestError(response.status);
  const json = await response.json();
  const translated = Array.isArray(json?.[0])
    ? json[0].map((part: any) => Array.isArray(part) ? part[0] : '').join('')
    : '';
  return String(translated).trim();
}

class GoogleFreeRequestError extends Error {
  constructor(public status: number) {
    super(`translation request failed: ${status}`);
  }
}

function googleFreeFailureReason(error: unknown): GoogleFreeFailureReason {
  if (error instanceof GoogleFreeRequestError && error.status === 429) return 'rate-limit';
  return 'network';
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    return await fetch(url, controller ? { ...init, signal: controller.signal } : init);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeProvider(value: unknown): TranslationProvider {
  if (value === 'google-free' || value === 'openai-compatible' || value === 'gemini' || value === 'anthropic') return value;
  return 'off';
}

function stringPref(key: string, fallback: string): string {
  const value = Zotero.Prefs?.get?.(key);
  return typeof value === 'string' ? value : fallback;
}

function booleanPref(key: string, fallback: boolean): boolean {
  const value = Zotero.Prefs?.get?.(key);
  return typeof value === 'boolean' ? value : fallback;
}
