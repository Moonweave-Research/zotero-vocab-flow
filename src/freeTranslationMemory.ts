export const GOOGLE_FREE_CACHE_PREF = 'extensions.vocabflow.translation.googleFree.cache.v1';

export type GoogleFreeFailureReason = 'network' | 'empty' | 'rejected' | 'rate-limit';
type CacheSource = 'manual' | 'google-free';

interface CacheEntry {
  meaning: string;
  source: CacheSource;
  createdAt: number;
  lastUsedAt: number;
}

interface FailureEntry {
  reason: GoogleFreeFailureReason;
  failedAt: number;
}

export interface GoogleFreeTranslationCache {
  version: 1;
  entries: Record<string, CacheEntry>;
  failures: Record<string, FailureEntry>;
}

const MAX_TRANSLATION_ENTRIES = 500;
const MAX_FAILURE_ENTRIES = 500;
const FAILURE_TTL_MS = 24 * 60 * 60 * 1000;
const GOOGLE_FREE_STALE_MS = 180 * 24 * 60 * 60 * 1000;

export function loadGoogleFreeTranslationCache(): GoogleFreeTranslationCache {
  const value = zoteroPrefs()?.get?.(GOOGLE_FREE_CACHE_PREF);
  if (typeof value !== 'string') return emptyCache();
  try {
    return normalizeCache(JSON.parse(value));
  } catch (_e) {
    return emptyCache();
  }
}

export function saveGoogleFreeTranslationCache(cache: GoogleFreeTranslationCache, now = Date.now()): void {
  zoteroPrefs()?.set?.(GOOGLE_FREE_CACHE_PREF, JSON.stringify(pruneCache(cache, now)));
}

export function clearGoogleFreeTranslationCache(): void {
  saveGoogleFreeTranslationCache(emptyCache());
}

export function normalizeFreeTranslationKey(term: string): string {
  return term
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[\s!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]+|[\s!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]+$/g, '')
    .replace(/[A-Z]/g, (char) => char.toLowerCase());
}

export function getCachedFreeTranslation(cache: GoogleFreeTranslationCache, term: string, now = Date.now()): string | null {
  const key = normalizeFreeTranslationKey(term);
  if (!key) return null;
  const entry = cache.entries[key];
  if (!entry) return null;
  if (entry.source === 'google-free' && now - entry.createdAt > GOOGLE_FREE_STALE_MS) return null;
  entry.lastUsedAt = now;
  return entry.meaning;
}

export function rememberManualFreeTranslation(cache: GoogleFreeTranslationCache, term: string, meaning: string, now = Date.now()): boolean {
  const key = normalizeFreeTranslationKey(term);
  const normalizedMeaning = normalizeMeaning(meaning);
  if (!key || !isAcceptableManualMeaning(term, normalizedMeaning)) return false;
  const existing = cache.entries[key];
  if (existing?.source === 'manual') return false;
  cache.entries[key] = {
    meaning: normalizedMeaning,
    source: 'manual',
    createdAt: existing?.createdAt ?? now,
    lastUsedAt: now
  };
  delete cache.failures[key];
  return true;
}

export function rememberGoogleFreeTranslation(cache: GoogleFreeTranslationCache, term: string, meaning: string, now = Date.now()): boolean {
  const key = normalizeFreeTranslationKey(term);
  const normalizedMeaning = normalizeMeaning(meaning);
  if (!key || !isAcceptableGoogleFreeTranslation(term, normalizedMeaning)) return false;
  if (cache.entries[key]?.source === 'manual') return false;
  cache.entries[key] = {
    meaning: normalizedMeaning,
    source: 'google-free',
    createdAt: now,
    lastUsedAt: now
  };
  delete cache.failures[key];
  return true;
}

export function rememberGoogleFreeFailure(cache: GoogleFreeTranslationCache, term: string, reason: GoogleFreeFailureReason, now = Date.now()): boolean {
  const key = normalizeFreeTranslationKey(term);
  if (!key) return false;
  cache.failures[key] = { reason, failedAt: now };
  return true;
}

export function hasFreshGoogleFreeFailure(cache: GoogleFreeTranslationCache, term: string, now = Date.now()): boolean {
  const key = normalizeFreeTranslationKey(term);
  if (!key) return false;
  const failure = cache.failures[key];
  return Boolean(failure && now - failure.failedAt < FAILURE_TTL_MS);
}

export function isAcceptableGoogleFreeTranslation(sourceTerm: string, translation: string): boolean {
  const meaning = normalizeMeaning(translation);
  if (!meaning) return false;
  if (isSameNormalizedTerm(sourceTerm, meaning)) return false;
  if (/<[^>]+>/.test(meaning)) return false;
  if (/https?:\/\/|www\./i.test(meaning)) return false;
  if (meaning.length > 80) return false;
  if (/^[\s\d\p{P}]+$/u.test(meaning)) return false;
  return true;
}

function isAcceptableManualMeaning(sourceTerm: string, meaning: string): boolean {
  if (!meaning) return false;
  if (isSameNormalizedTerm(sourceTerm, meaning)) return false;
  if (/<[^>]+>/.test(meaning)) return false;
  if (meaning.length > 120) return false;
  return true;
}

function normalizeMeaning(meaning: string): string {
  return meaning.trim().replace(/\s+/g, ' ');
}

function isSameNormalizedTerm(sourceTerm: string, meaning: string): boolean {
  const sourceKey = normalizeFreeTranslationKey(sourceTerm);
  return Boolean(sourceKey && sourceKey === normalizeFreeTranslationKey(meaning));
}

function emptyCache(): GoogleFreeTranslationCache {
  return { version: 1, entries: {}, failures: {} };
}

function normalizeCache(value: any): GoogleFreeTranslationCache {
  const cache = emptyCache();
  if (!value || typeof value !== 'object') return cache;
  for (const [key, entry] of Object.entries(value.entries ?? {})) {
    if (!entry || typeof entry !== 'object') continue;
    const typed = entry as Partial<CacheEntry>;
    if (typeof typed.meaning !== 'string') continue;
    if (typed.source !== 'manual' && typed.source !== 'google-free') continue;
    cache.entries[key] = {
      meaning: typed.meaning,
      source: typed.source,
      createdAt: numberOrNow(typed.createdAt),
      lastUsedAt: numberOrNow(typed.lastUsedAt)
    };
  }
  for (const [key, failure] of Object.entries(value.failures ?? {})) {
    if (!failure || typeof failure !== 'object') continue;
    const typed = failure as Partial<FailureEntry>;
    if (!isFailureReason(typed.reason)) continue;
    cache.failures[key] = {
      reason: typed.reason,
      failedAt: numberOrNow(typed.failedAt)
    };
  }
  return cache;
}

function pruneCache(cache: GoogleFreeTranslationCache, now: number): GoogleFreeTranslationCache {
  const entries = Object.fromEntries(
    Object.entries(cache.entries)
      .sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)
      .slice(0, MAX_TRANSLATION_ENTRIES)
  );
  const failures = Object.fromEntries(
    Object.entries(cache.failures)
      .filter(([, failure]) => now - failure.failedAt < FAILURE_TTL_MS)
      .sort((a, b) => b[1].failedAt - a[1].failedAt)
      .slice(0, MAX_FAILURE_ENTRIES)
  );
  return { version: 1, entries, failures };
}

function numberOrNow(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}

function isFailureReason(value: unknown): value is GoogleFreeFailureReason {
  return value === 'network' || value === 'empty' || value === 'rejected' || value === 'rate-limit';
}

function zoteroPrefs(): any {
  return (globalThis as any).Zotero?.Prefs;
}
