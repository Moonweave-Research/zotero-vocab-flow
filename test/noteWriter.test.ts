import test from 'node:test';
import assert from 'node:assert/strict';
import { writeVocabNote, VOCAB_TAG } from '../src/noteWriter';

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
  assert.ok(note.saved);
});

test('updates the existing tagged note instead of creating a duplicate', async () => {
  const existing = fakeNote([VOCAB_TAG]);
  existing.note = '<p>old</p>';
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
