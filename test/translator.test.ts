import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslatorFromPrefs } from '../src/translator';

test('keeps translation disabled by default', async () => {
  let fetched = false;
  (globalThis as any).Zotero = {
    Prefs: { get: () => undefined }
  };
  (globalThis as any).fetch = async () => {
    fetched = true;
    throw new Error('should not fetch');
  };

  const translator = createTranslatorFromPrefs();
  const result = await translator.translate(['polymer']);

  assert.equal(translator.provider, 'off');
  assert.deepEqual(result, new Map());
  assert.equal(fetched, false);
});

test('uses the experimental no-key Google provider when explicitly enabled', async () => {
  const urls: string[] = [];
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => key === 'extensions.vocabflow.translation.provider' ? 'google-free' : undefined
    }
  };
  (globalThis as any).fetch = async (url: string) => {
    urls.push(url);
    return {
      ok: true,
      json: async () => [[['고분자', 'polymer', null, null]]]
    };
  };

  const translator = createTranslatorFromPrefs();
  const result = await translator.translate(['polymer']);

  assert.equal(translator.provider, 'google-free');
  assert.equal(result.get('polymer'), '고분자');
  assert.equal(urls.length, 1);
  assert.match(urls[0], /translate_a\/single/);
  assert.match(urls[0], /tl=ko/);
});

test('keeps successful Google translations when one request fails', async () => {
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => key === 'extensions.vocabflow.translation.provider' ? 'google-free' : undefined
    }
  };
  (globalThis as any).fetch = async (url: string) => {
    if (String(url).includes('actuator')) throw new Error('network down');
    return {
      ok: true,
      json: async () => [[['고분자', 'polymer', null, null]]]
    };
  };

  const translator = createTranslatorFromPrefs();
  const result = await translator.translate(['polymer', 'actuator']);

  assert.equal(result.get('polymer'), '고분자');
  assert.equal(result.has('actuator'), false);
});
