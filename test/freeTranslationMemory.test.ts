import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_FREE_CACHE_PREF,
  clearGoogleFreeTranslationCache,
  getCachedFreeTranslation,
  hasFreshGoogleFreeFailure,
  isAcceptableGoogleFreeTranslation,
  loadGoogleFreeTranslationCache,
  normalizeFreeTranslationKey,
  rememberGoogleFreeFailure,
  rememberGoogleFreeTranslation,
  rememberManualFreeTranslation,
  saveGoogleFreeTranslationCache
} from '../src/freeTranslationMemory';

test('normalizes free translation cache keys conservatively', () => {
  assert.equal(normalizeFreeTranslationKey(' Polymer. '), 'polymer');
  assert.equal(normalizeFreeTranslationKey('finite   element'), 'finite element');
  assert.equal(normalizeFreeTranslationKey('T-cell'), 't-cell');
  assert.equal(normalizeFreeTranslationKey('ÄCTIN'), 'Äctin');
});

test('manual free translation cache entries outrank google-free entries', () => {
  const cache = loadGoogleFreeTranslationCache();
  rememberGoogleFreeTranslation(cache, 'polymer', '폴리머', 1000);
  rememberManualFreeTranslation(cache, 'Polymer.', '고분자', 2000);
  rememberGoogleFreeTranslation(cache, 'polymer', '폴리머2', 3000);

  assert.equal(getCachedFreeTranslation(cache, 'polymer', 4000), '고분자');
});

test('fresh free translation failure markers block fetch until they expire', () => {
  const cache = loadGoogleFreeTranslationCache();
  rememberGoogleFreeFailure(cache, 'actuator', 'rate-limit', 10_000);

  assert.equal(hasFreshGoogleFreeFailure(cache, 'actuator', 10_000 + 60_000), true);
  assert.equal(hasFreshGoogleFreeFailure(cache, 'actuator', 10_000 + 25 * 60 * 60 * 1000), false);
});

test('rejects obviously bad google-free output', () => {
  assert.equal(isAcceptableGoogleFreeTranslation('polymer', '고분자'), true);
  assert.equal(isAcceptableGoogleFreeTranslation('polymer', 'polymer'), false);
  assert.equal(isAcceptableGoogleFreeTranslation('polymer', 'Polymer.'), false);
  assert.equal(isAcceptableGoogleFreeTranslation('polymer', '<b>고분자</b>'), false);
  assert.equal(isAcceptableGoogleFreeTranslation('polymer', 'https://example.test'), false);
  assert.equal(isAcceptableGoogleFreeTranslation('polymer', '1'.repeat(81)), false);
});

test('loads malformed free translation cache as empty and clears both entries and failures', () => {
  const prefs = new Map<string, unknown>([[GOOGLE_FREE_CACHE_PREF, '{bad json']]);
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => prefs.get(key),
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  const cache = loadGoogleFreeTranslationCache();
  assert.deepEqual(Object.keys(cache.entries), []);
  assert.deepEqual(Object.keys(cache.failures), []);

  rememberGoogleFreeTranslation(cache, 'polymer', '고분자', 1000);
  rememberGoogleFreeFailure(cache, 'actuator', 'network', 1000);
  saveGoogleFreeTranslationCache(cache, 1000);
  clearGoogleFreeTranslationCache();

  const cleared = JSON.parse(String(prefs.get(GOOGLE_FREE_CACHE_PREF)));
  assert.deepEqual(cleared.entries, {});
  assert.deepEqual(cleared.failures, {});
});
