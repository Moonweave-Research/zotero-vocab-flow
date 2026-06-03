import test from 'node:test';
import assert from 'node:assert/strict';
import { fillMissingMeanings, writeVocabNote, VOCAB_TAG } from '../src/noteWriter';

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
  assert.match(note.note, /polymer/);
  assert.match(note.note, /actuator/);
  assert.match(note.note, /<th>용어 \(Term\)<\/th><th>한국어 뜻 \(Korean meaning\)<\/th>/);
  assert.ok(note.saved);
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
  assert.match(note.note, /<h2>단어장 \(1\)<\/h2>/);
  assert.match(note.note, /<th>용어 \(Term\)<\/th>/);
  assert.match(note.note, /<th>한국어 뜻 \(Korean meaning\)<\/th>/);
  assert.match(note.note, /data-vocab-flow-word="polymer"/);
  assert.doesNotMatch(note.note, /<th>English<\/th>/);
  assert.doesNotMatch(note.note, /<h2>Vocab/);
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

  const result = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (words) => {
    assert.deepEqual(words, ['actuator']);
    return new Map([['actuator', '액추에이터']]);
  });

  assert.deepEqual(result, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(existing.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td>액추에이터<\/td>/);
  assert.ok(existing.saved);
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

  const result = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (words) => {
    assert.deepEqual(words, ['actuator']);
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

  const filled = await fillMissingMeanings({ id: 5, getNotes: () => [99] }, async (words) => {
    assert.deepEqual(words, ['actuator']);
    return new Map([['actuator', '액추에이터']]);
  });
  assert.deepEqual(filled, { status: 'translated', translatedCount: 1 });
  assert.match(existing.note, /data-vocab-flow-word="polymer"><td data-cell="word">polymer<\/td><td data-cell="meaning">고분자<\/td>/);
  assert.match(existing.note, /data-vocab-flow-word="actuator"><td data-cell="word">actuator<\/td><td data-cell="meaning">액추에이터<\/td>/);

  const regenerated = await writeVocabNote({ id: 5, getNotes: () => [99] }, ['polymer', 'actuator']);
  assert.match(regenerated.note, /data-vocab-flow-word="polymer"><td>polymer<\/td><td>고분자<\/td>/);
  assert.match(regenerated.note, /data-vocab-flow-word="actuator"><td>actuator<\/td><td>액추에이터<\/td>/);
});
