import test from 'node:test';
import assert from 'node:assert/strict';
import { fillMissingMeanings, fillMissingMeaningsWithGoogleFreeMemory, writeVocabNote, VOCAB_TAG } from '../src/noteWriter';
import { GOOGLE_FREE_CACHE_PREF } from '../src/freeTranslationMemory';

function fakeNote(existingTags: string[] = []) {
  const tags = new Set(existingTags);
  return {
    note: '',
    parentID: undefined as number | undefined,
    saved: false,
    setNote(html: string) { this.note = html; },
    addTag(tag: string) { tags.add(tag); },
    hasTag(tag: string) { return tags.has(tag); },
    async saveTx() { this.saved = true; }
  };
}

test('creates a new tagged note when none exists', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => ({}) },
    Item: function () { return created; }
  };
  const parent = { id: 5, getNotes: () => [] };

  const note = await writeVocabNote(parent, ['polymer', 'actuator']);

  assert.equal(note.parentID, 5);
  assert.ok(note.hasTag(VOCAB_TAG));
  assert.match(note.note, /<h2>단어장 \(2\) - Vocab Flow Wordbook<\/h2>/);
  assert.match(note.note, /polymer/);
  assert.match(note.note, /actuator/);
  assert.match(note.note, /<th>용어 \(Term\)<\/th><th>한국어 뜻 \(Korean meaning\)<\/th>/);
  assert.ok(note.saved);
});

test('stores source context metadata on final vocab rows when provided', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => ({}) },
    Item: function () { return created; }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [] }, [
    { label: 'valence', sourceText: 'The valence state changed.', sourceIndex: 3 },
    { label: 'H&E', sourceText: 'H&E staining was used.', sourceIndex: 4 }
  ]);

  assert.match(note.note, /data-vocab-flow-word="valence" data-vocab-flow-source-index="3" data-vocab-flow-source-text="The valence state changed\."/);
  assert.match(note.note, /data-vocab-flow-word="H&amp;E" data-vocab-flow-source-index="4" data-vocab-flow-source-text="H&amp;E staining was used\."/);
});

test('preserves existing source context metadata when regenerating final vocab rows', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="valence" data-vocab-flow-source-index="3" data-vocab-flow-source-text="The valence state changed."><td>valence</td><td>원자가</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['valence']);

  assert.match(note.note, /data-vocab-flow-word="valence" data-vocab-flow-source-index="3" data-vocab-flow-source-text="The valence state changed."><td>valence<\/td><td>원자가<\/td>/);
});

test('updates the existing tagged note instead of creating a duplicate', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = '<p data-vocab-flow="words">old</p>';
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : { hasTag: () => false }) },
    Item: function () { throw new Error('should not create a new note'); }
  };
  const parent = { id: 5, getNotes: () => [99] };

  const note = await writeVocabNote(parent, ['viscosity']);

  assert.equal(note, existing);
  assert.match(note.note, /viscosity/);
  assert.doesNotMatch(note.note, /old/);
  assert.ok(note.saved);
});

test('updates an existing generated vocab note that has the ownership marker even if the tag is missing', async () => {
  const existing = fakeNote();
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody><tr data-vocab-flow-word="polymer"><td>polymer</td><td>고분자</td></tr></tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer', 'actuator']);

  assert.equal(note, existing);
  assert.ok(note.hasTag(VOCAB_TAG));
  assert.match(note.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(note.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td><\/td>/);
});

test('does not overwrite user notes outside the generated vocab block', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<p>사용자 메모: 다시 실행해도 남아야 함</p>',
    '<section data-vocab-flow="words"><h2>Old</h2><ul><li>old</li></ul></section>',
    '<p>뜻 정리</p>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer']);

  assert.match(note.note, /사용자 메모/);
  assert.match(note.note, /뜻 정리/);
  assert.match(note.note, /polymer/);
  assert.doesNotMatch(note.note, /<li>old<\/li>/);
});

test('ignores user notes that only happen to have the vocab tag without the ownership marker', async () => {
  const userTagged = fakeNote([VOCAB_TAG]);
  userTagged.note = '<p>사용자가 직접 만든 노트</p>';
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? userTagged : null) },
    Item: function () { return created; }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['actuator']);

  assert.equal(note, created);
  assert.match(userTagged.note, /사용자가 직접 만든 노트/);
  assert.equal(created.parentID, 5);
});

test('migrates legacy generated vocab notes that predate the ownership marker', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = '<h2>Vocab (1)</h2><ul><li>old</li></ul>';
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer']);

  assert.equal(note, existing);
  assert.match(existing.note, /<section data-vocab-flow="words">/);
  assert.match(existing.note, /polymer/);
});

test('renders an editable Korean meaning column for each word', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => ({}) },
    Item: function () { return created; }
  };

  const note = await writeVocabNote({ id: 7, getNotes: () => [] }, ['polymer']);

  assert.match(note.note, /<table>/);
  assert.match(note.note, /Vocab Flow Wordbook/);
  assert.match(note.note, /<h2>단어장 \(1\) - Vocab Flow Wordbook<\/h2>/);
  assert.match(note.note, /<th>용어 \(Term\)<\/th>/);
  assert.match(note.note, /<th>한국어 뜻 \(Korean meaning\)<\/th>/);
  assert.match(note.note, /data-vocab-flow-word="polymer"/);
  assert.doesNotMatch(note.note, /<th>English<\/th>/);
  assert.doesNotMatch(note.note, /<h2>Vocab \(/);
});

test('preserves manually entered Korean meanings when regenerating the vocab table', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><thead><tr><th>English</th><th>한국어 뜻</th></tr></thead>',
    '<tbody><tr data-vocab-flow-word="polymer"><td>polymer</td><td>고분자</td></tr></tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer', 'actuator']);

  assert.match(note.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(note.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td><\/td>/);
});

test('escapes HTML special chars in words (ampersand before angle brackets)', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => ({}) },
    Item: function () { return created; }
  };
  const note = await writeVocabNote({ id: 7, getNotes: () => [] }, ['H&E', '<tag>']);
  assert.match(note.note, /H&amp;E/);
  assert.match(note.note, /&lt;tag&gt;/);
  assert.doesNotMatch(note.note, /<tag>/);
});

test('fills only missing Korean meanings in the generated vocab note', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (2)</h2>',
    '<table><thead><tr><th>English</th><th>한국어 뜻</th></tr></thead>',
    '<tbody>',
    '<tr data-vocab-flow-word="polymer"><td>polymer</td><td>고분자</td></tr>',
    '<tr data-vocab-flow-word="actuator"><td>actuator</td><td></td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  const result = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (terms) => {
    assert.deepEqual(terms.map((term) => term.word), ['actuator']);
    return new Map([['actuator', '액추에이터']]);
  });

  assert.deepEqual(result, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(existing.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td>액추에이터<\/td>/);
  assert.ok(existing.saved);
});

test('fills google-free blanks from the same wordbook note without fetching', async () => {
  const prefs = new Map<string, unknown>();
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (2)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="polymer"><td>polymer</td><td>고분자</td></tr>',
    '<tr data-vocab-flow-word="Polymer."><td>Polymer.</td><td></td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Prefs: {
      get: (key: string) => prefs.get(key),
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  const result = await fillMissingMeaningsWithGoogleFreeMemory({ id: 5, getNotes: () => [99] }, async () => {
    throw new Error('google-free fetch should not be needed');
  });

  const cache = JSON.parse(String(prefs.get(GOOGLE_FREE_CACHE_PREF)));
  assert.deepEqual(result, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /data-vocab-flow-word="Polymer\."><td>Polymer\.<\/td><td>고분자<\/td>/);
  assert.equal(cache.entries.polymer.source, 'manual');
});

test('fills google-free blanks from persistent cache without fetching', async () => {
  const prefs = new Map<string, unknown>([
    [GOOGLE_FREE_CACHE_PREF, JSON.stringify({
      version: 1,
      entries: {
        actuator: {
          meaning: '액추에이터',
          source: 'google-free',
          createdAt: Date.now(),
          lastUsedAt: Date.now()
        }
      },
      failures: {}
    })]
  ]);
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="Actuator"><td>Actuator</td><td></td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Prefs: {
      get: (key: string) => prefs.get(key),
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  const result = await fillMissingMeaningsWithGoogleFreeMemory({ id: 5, getNotes: () => [99] }, async () => {
    throw new Error('google-free fetch should not be needed');
  });

  assert.deepEqual(result, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /data-vocab-flow-word="Actuator"><td>Actuator<\/td><td>액추에이터<\/td>/);
});

test('does not mutate google-free cache when there are no blank meanings', async () => {
  const prefs = new Map<string, unknown>();
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="polymer"><td>polymer</td><td>고분자</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Prefs: {
      get: (key: string) => prefs.get(key),
      set: (key: string, value: unknown) => prefs.set(key, value)
    }
  };

  const result = await fillMissingMeaningsWithGoogleFreeMemory({ id: 5, getNotes: () => [99] }, async () => {
    throw new Error('translator should not be called');
  });

  assert.deepEqual(result, { status: 'empty' });
  assert.equal(prefs.has(GOOGLE_FREE_CACHE_PREF), false);
});

test('does not call translator when all Korean meanings are already filled', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="polymer"><td>polymer</td><td>고분자</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  const result = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async () => {
    throw new Error('translator should not be called');
  });

  assert.deepEqual(result, { status: 'empty' });
});

test('reports untranslated when blank meanings exist but provider returns no results', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="actuator"><td>actuator</td><td></td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  const result = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (terms) => {
    assert.deepEqual(terms.map((term) => term.word), ['actuator']);
    return new Map();
  });

  assert.deepEqual(result, { status: 'untranslated', missingCount: 1 });
  assert.equal(existing.saved, false);
});

test('preserves and fills meanings when Zotero adds attributes to table cells', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (2)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="polymer"><td data-cell="word">polymer</td><td data-cell="meaning">고분자</td></tr>',
    '<tr data-vocab-flow-word="actuator"><td data-cell="word">actuator</td><td data-cell="meaning"></td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const filled = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (terms) => {
    assert.deepEqual(terms.map((term) => term.word), ['actuator']);
    return new Map([['actuator', '액추에이터']]);
  });
  assert.deepEqual(filled, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /data-vocab-flow-word="polymer"><td data-cell="word">polymer<\/td><td data-cell="meaning">고분자<\/td>/);
  assert.match(existing.note, /data-vocab-flow-word="actuator"><td data-cell="word">actuator<\/td><td data-cell="meaning">액추에이터<\/td>/);

  const regenerated = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer', 'actuator']);
  assert.match(regenerated.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(regenerated.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td>액추에이터<\/td>/);
});

test('passes source context metadata to the meaning translator callback', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<section data-vocab-flow="words">',
    '<h2>Vocab (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-word="valence" data-vocab-flow-source-index="3" data-vocab-flow-source-text="The valence state changed."><td>valence</td><td></td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (terms) => {
    assert.deepEqual(terms, [
      {
        word: 'valence',
        sourceText: 'The valence state changed.',
        sourceIndex: 3
      }
    ]);
    return new Map([['valence', '원자가']]);
  });
});

test('recognizes and updates Zotero-sanitized wordbook notes without data attributes', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<div data-schema-version="9">',
    '<h2>단어장 (2) - Vocab Flow Wordbook</h2>',
    '<table><tbody>',
    '<tr><th><p>용어 (Term)</p></th><th><p>한국어 뜻 (Korean meaning)</p></th></tr>',
    '<tr><td><p>polymer</p></td><td><p>고분자</p></td></tr>',
    '<tr><td><p>actuator</p></td><td><p></p></td></tr>',
    '</tbody></table>',
    '</div>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a duplicate note'); }
  };

  const filled = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (terms) => {
    assert.deepEqual(terms.map((term) => term.word), ['actuator']);
    return new Map([['actuator', '액추에이터']]);
  });
  assert.deepEqual(filled, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /<td><p>actuator<\/p><\/td><td><p>액추에이터<\/p><\/td>/);

  const regenerated = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer', 'actuator', 'elastomer']);
  assert.equal(regenerated, existing);
  assert.match(existing.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(existing.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td>액추에이터<\/td>/);
  assert.match(existing.note, /data-vocab-flow-word="elastomer"><td>elastomer<\/td><td><\/td>/);
});

test('does not overwrite a note that only mentions the wordbook heading', async () => {
  const userNote = fakeNote();
  userNote.note = '<h2>Vocab Flow Wordbook</h2><p>사용자가 보존한 설명 노트</p>';
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? userNote : null) },
    Item: function () { return created; }
  };

  const filled = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async () => {
    throw new Error('translator should not be called');
  });
  assert.deepEqual(filled, { status: 'empty' });

  const note = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer']);
  assert.equal(note, created);
  assert.equal(userNote.note, '<h2>Vocab Flow Wordbook</h2><p>사용자가 보존한 설명 노트</p>');
});

test('fills blank meanings in mixed data-attribute and sanitized wordbook rows', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = [
    '<div data-schema-version="9">',
    '<h2>단어장 (2) - Vocab Flow Wordbook</h2>',
    '<table><tbody>',
    '<tr><th><p>용어 (Term)</p></th><th><p>한국어 뜻 (Korean meaning)</p></th></tr>',
    '<tr data-vocab-flow-word="polymer"><td>polymer</td><td></td></tr>',
    '<tr><td><p>actuator</p></td><td><p></p></td></tr>',
    '</tbody></table>',
    '</div>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  const filled = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (terms) => {
    assert.deepEqual(terms.map((term) => term.word), ['polymer', 'actuator']);
    return new Map([
      ['polymer', '고분자'],
      ['actuator', '액추에이터']
    ]);
  });

  assert.deepEqual(filled, { status: 'translated', translatedCount: 2 });
  assert.match(existing.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(existing.note, /<td><p>actuator<\/p><\/td><td><p>액추에이터<\/p><\/td>/);
});
