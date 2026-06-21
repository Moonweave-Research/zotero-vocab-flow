import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTranslatorFromPrefs,
  setAnthropicTranslationPrefs,
  setGeminiTranslationPrefs,
  setOpenAICompatibleTranslationPrefs
} from '../src/translator';

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

test('deduplicates repeated Google free terms during one translation run', async () => {
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

  const result = await createTranslatorFromPrefs().translate(['polymer', 'polymer']);

  assert.equal(result.get('polymer'), '고분자');
  assert.equal(urls.length, 1);
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

test('uses a Gemini provider with optional source context', async () => {
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'gemini'],
    ['extensions.vocabflow.translation.gemini.endpoint', 'https://generativelanguage.googleapis.test/v1beta/models'],
    ['extensions.vocabflow.translation.gemini.apiKey', 'gemini-test-key'],
    ['extensions.vocabflow.translation.gemini.model', 'gemini-test-model'],
    ['extensions.vocabflow.translation.gemini.sendContext', true]
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
        candidates: [
          {
            content: {
              parts: [{ text: '{"valence":"원자가"}' }]
            }
          }
        ]
      })
    };
  };

  const translator = createTranslatorFromPrefs();
  const result = await translator.translate([
    { word: 'valence', sourceText: 'The valence state changed.', sourceIndex: 3 }
  ]);

  assert.equal(translator.provider, 'gemini');
  assert.equal(result.get('valence'), '원자가');
  assert.equal(requests[0].url, 'https://generativelanguage.googleapis.test/v1beta/models/gemini-test-model:generateContent?key=gemini-test-key');
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.match(body.contents[0].parts[0].text, /The valence state changed\./);
});

test('does not call Gemini when required settings are missing', async () => {
  let fetched = false;
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'gemini'],
    ['extensions.vocabflow.translation.gemini.endpoint', 'https://generativelanguage.googleapis.test/v1beta/models'],
    ['extensions.vocabflow.translation.gemini.apiKey', ''],
    ['extensions.vocabflow.translation.gemini.model', 'gemini-test-model']
  ]);
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => prefs.get(key)
    }
  };
  (globalThis as any).fetch = async () => {
    fetched = true;
    throw new Error('should not fetch');
  };

  const result = await createTranslatorFromPrefs().translate(['valence']);

  assert.equal(fetched, false);
  assert.deepEqual(result, new Map());
});

test('uses an Anthropic provider with optional source context', async () => {
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'anthropic'],
    ['extensions.vocabflow.translation.anthropic.endpoint', 'https://api.anthropic.test/v1/messages'],
    ['extensions.vocabflow.translation.anthropic.apiKey', 'anthropic-test-key'],
    ['extensions.vocabflow.translation.anthropic.model', 'claude-test-model'],
    ['extensions.vocabflow.translation.anthropic.sendContext', true]
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
        content: [{ type: 'text', text: '{"valence":"원자가"}' }]
      })
    };
  };

  const translator = createTranslatorFromPrefs();
  const result = await translator.translate([
    { word: 'valence', sourceText: 'The valence state changed.', sourceIndex: 3 }
  ]);

  assert.equal(translator.provider, 'anthropic');
  assert.equal(result.get('valence'), '원자가');
  assert.equal(requests[0].url, 'https://api.anthropic.test/v1/messages');
  const headers = requests[0].init.headers as Record<string, string>;
  assert.equal(headers['x-api-key'], 'anthropic-test-key');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.model, 'claude-test-model');
  assert.match(body.messages[0].content, /The valence state changed\./);
});

test('does not call Anthropic when required settings are missing', async () => {
  let fetched = false;
  const prefs = new Map<string, unknown>([
    ['extensions.vocabflow.translation.provider', 'anthropic'],
    ['extensions.vocabflow.translation.anthropic.endpoint', 'https://api.anthropic.test/v1/messages'],
    ['extensions.vocabflow.translation.anthropic.apiKey', 'anthropic-test-key'],
    ['extensions.vocabflow.translation.anthropic.model', '']
  ]);
  (globalThis as any).Zotero = {
    Prefs: {
      get: (key: string) => prefs.get(key)
    }
  };
  (globalThis as any).fetch = async () => {
    fetched = true;
    throw new Error('should not fetch');
  };

  const result = await createTranslatorFromPrefs().translate(['valence']);

  assert.equal(fetched, false);
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

test('stores Gemini translation settings and provider together', () => {
  const prefs = new Map<string, unknown>();
  (globalThis as any).Zotero = {
    Prefs: {
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  setGeminiTranslationPrefs({
    endpoint: ' https://generativelanguage.googleapis.com/v1beta/models ',
    apiKey: ' gemini-test-key ',
    model: ' gemini-2.5-flash ',
    sendContext: true
  });

  assert.equal(prefs.get('extensions.vocabflow.translation.provider'), 'gemini');
  assert.equal(prefs.get('extensions.vocabflow.translation.gemini.endpoint'), 'https://generativelanguage.googleapis.com/v1beta/models');
  assert.equal(prefs.get('extensions.vocabflow.translation.gemini.apiKey'), 'gemini-test-key');
  assert.equal(prefs.get('extensions.vocabflow.translation.gemini.model'), 'gemini-2.5-flash');
  assert.equal(prefs.get('extensions.vocabflow.translation.gemini.sendContext'), true);
});

test('stores Anthropic translation settings and provider together', () => {
  const prefs = new Map<string, unknown>();
  (globalThis as any).Zotero = {
    Prefs: {
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  setAnthropicTranslationPrefs({
    endpoint: ' https://api.anthropic.com/v1/messages ',
    apiKey: ' anthropic-test-key ',
    model: ' claude-sonnet-4-20250514 ',
    sendContext: true
  });

  assert.equal(prefs.get('extensions.vocabflow.translation.provider'), 'anthropic');
  assert.equal(prefs.get('extensions.vocabflow.translation.anthropic.endpoint'), 'https://api.anthropic.com/v1/messages');
  assert.equal(prefs.get('extensions.vocabflow.translation.anthropic.apiKey'), 'anthropic-test-key');
  assert.equal(prefs.get('extensions.vocabflow.translation.anthropic.model'), 'claude-sonnet-4-20250514');
  assert.equal(prefs.get('extensions.vocabflow.translation.anthropic.sendContext'), true);
});
