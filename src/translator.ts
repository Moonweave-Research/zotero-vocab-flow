export type TranslationProvider = 'off' | 'google-free' | 'openai-compatible';

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
const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 8000;

export interface OpenAICompatibleTranslationSettings {
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

export function getOpenAICompatibleTranslationSettings(): OpenAICompatibleTranslationSettings {
  return {
    endpoint: stringPref(OPENAI_ENDPOINT_PREF, DEFAULT_OPENAI_ENDPOINT),
    apiKey: stringPref(OPENAI_API_KEY_PREF, ''),
    model: stringPref(OPENAI_MODEL_PREF, ''),
    sendContext: booleanPref(OPENAI_SEND_CONTEXT_PREF, false)
  };
}

export function createTranslatorFromPrefs(): Translator {
  const provider = normalizeProvider(Zotero.Prefs?.get?.(PROVIDER_PREF));
  if (provider === 'google-free') return new GoogleFreeTranslator();
  if (provider === 'openai-compatible') return new OpenAICompatibleTranslator(getOpenAICompatibleTranslationSettings());
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
    for (const input of normalizeTranslationInputs(words)) {
      try {
        const translated = await translateWithGoogleFree(input.word);
        if (translated) translations.set(input.word, translated);
      } catch (_e) {
        // Keep partial results; one blocked/rate-limited term should not discard earlier meanings.
      }
    }
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
            content: 'Translate academic vocabulary into concise Korean meanings. Return only a JSON object mapping each exact input term to its Korean meaning. Do not add extra keys.'
          },
          {
            role: 'user',
            content: buildOpenAICompatiblePrompt(inputs, this.settings.sendContext)
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

function normalizeTranslationInputs(inputs: TranslationInputLike[]): TranslationInput[] {
  return inputs.map((input) => typeof input === 'string' ? { word: input } : input);
}

function buildOpenAICompatiblePrompt(inputs: TranslationInput[], sendContext: boolean): string {
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
  if (!response.ok) throw new Error(`translation request failed: ${response.status}`);
  const json = await response.json();
  const translated = Array.isArray(json?.[0])
    ? json[0].map((part: any) => Array.isArray(part) ? part[0] : '').join('')
    : '';
  return String(translated).trim();
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
  if (value === 'google-free' || value === 'openai-compatible') return value;
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
