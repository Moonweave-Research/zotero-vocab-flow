import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslatorFromPrefs, setOpenAICompatibleTranslationPrefs } from '../src/translator';

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

test('uses an OpenAI-compatible provider with optional source context', async () => {
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'openai-compatible'],
    ['extensions.vocabflow.translation.openai.endpoint', 'https://llm.example.test/v1/chat/completions'],
    ['extensions.vocabflow.translation.openai.apiKey', 'sk-test'],
    ['extensions.vocabflow.translation.openai.model', 'research-translator'],
    ['extensions.vocabflow.translation.openai.sendContext', true]
  ]);
  const requests: Array<{ url: string; init: RequestInit }> = [];
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => prefs.get(key)
    }
  };
  (globalThis as any).fetch = async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"valence":"원자가","elements":"원소"}'
            }
          }
        ]
      })
    };
  };

  const translator = createTranslatorFromPrefs();
  const result = await translator.translate([
    { word: 'valence', sourceText: 'The valence state changed.', sourceIndex: 3 },
    { word: 'elements', sourceText: 'The elements remained stable.', sourceIndex: 4 }
  ]);

  assert.equal(translator.provider, 'openai-compatible');
  assert.equal(result.get('valence'), '원자가');
  assert.equal(result.get('elements'), '원소');
  assert.equal(requests[0].url, 'https://llm.example.test/v1/chat/completions');
  assert.equal((requests[0].init.headers as Record<string, string>).Authorization, 'Bearer sk-test');
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.model, 'research-translator');
  assert.match(body.messages[1].content, /The valence state changed\./);
});

test('omits source context for OpenAI-compatible translation when the context toggle is off', async () => {
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'openai-compatible'],
    ['extensions.vocabflow.translation.openai.endpoint', 'https://llm.example.test/v1/chat/completions'],
    ['extensions.vocabflow.translation.openai.apiKey', 'sk-test'],
    ['extensions.vocabflow.translation.openai.model', 'research-translator'],
    ['extensions.vocabflow.translation.openai.sendContext', false]
  ]);
  let body = '';
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => prefs.get(key)
    }
  };
  (globalThis as any).fetch = async (_url: string, init: RequestInit) => {
    body = String(init.body);
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"valence":"원자가"}' } }]
      })
    };
  };

  await createTranslatorFromPrefs().translate([
    { word: 'valence', sourceText: 'The valence state changed.', sourceIndex: 3 }
  ]);

  assert.doesNotMatch(body, /The valence state changed\./);
  assert.match(body, /valence/);
});

test('treats malformed OpenAI-compatible translation output as no results', async () => {
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'openai-compatible'],
    ['extensions.vocabflow.translation.openai.endpoint', 'https://llm.example.test/v1/chat/completions'],
    ['extensions.vocabflow.translation.openai.apiKey', 'sk-test'],
    ['extensions.vocabflow.translation.openai.model', 'research-translator']
  ]);
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => prefs.get(key)
    }
  };
  (globalThis as any).fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'not json' } }]
    })
  });

  const result = await createTranslatorFromPrefs().translate(['valence']);

  assert.deepEqual(result, new Map());
});

test('stores OpenAI-compatible translation settings and provider together', () => {
  const prefs = new Map<string, unknown>();
  (globalThis as any).Zotero = {
    Prefs: {
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  setOpenAICompatibleTranslationPrefs({
    endpoint: ' https://llm.example.test/v1/chat/completions ',
    apiKey: ' sk-test ',
    model: ' research-translator ',
    sendContext: true
  });

  assert.equal(prefs.get('extensions.vocabflow.translation.provider'), 'openai-compatible');
  assert.equal(prefs.get('extensions.vocabflow.translation.openai.endpoint'), 'https://llm.example.test/v1/chat/completions');
  assert.equal(prefs.get('extensions.vocabflow.translation.openai.apiKey'), 'sk-test');
  assert.equal(prefs.get('extensions.vocabflow.translation.openai.model'), 'research-translator');
  assert.equal(prefs.get('extensions.vocabflow.translation.openai.sendContext'), true);
});
