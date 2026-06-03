export type TranslationProvider = 'off' | 'google-free';

export interface Translator {
  provider: TranslationProvider;
  translate(words: string[]): Promise<Map<string, string>>;
}

const PROVIDER_PREF = 'extensions.vocabflow.translation.provider';
const REQUEST_TIMEOUT_MS = 8000;

export function setTranslationProviderPref(provider: TranslationProvider): void {
  Zotero.Prefs?.set?.(PROVIDER_PREF, provider);
}

export function createTranslatorFromPrefs(): Translator {
  const provider = normalizeProvider(Zotero.Prefs?.get?.(PROVIDER_PREF));
  if (provider === 'google-free') return new GoogleFreeTranslator();
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

  async translate(words: string[]): Promise<Map<string, string>> {
    const translations = new Map<string, string>();
    for (const word of words) {
      try {
        const translated = await translateWithGoogleFree(word);
        if (translated) translations.set(word, translated);
      } catch (_e) {
        // Keep partial results; one blocked/rate-limited term should not discard earlier meanings.
      }
    }
    return translations;
  }
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

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    return await fetch(url, controller ? { signal: controller.signal } : undefined);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeProvider(value: unknown): TranslationProvider {
  return value === 'google-free' ? 'google-free' : 'off';
}
