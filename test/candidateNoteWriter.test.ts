import test from 'node:test';
import assert from 'node:assert/strict';
import { Candidate, CANDIDATE_TAG, discardCandidateNote, readAcceptedCandidateLabels, writeCandidateNote } from '../src/candidateNoteWriter';

function fakeNote(tags: string[] = []) {
  const tagSet = new Set(tags);
  return {
    note: '',
    parentID: undefined as number | undefined,
    saved: false,
    hasTag: (tag: string) => tagSet.has(tag),
    addTag: (tag: string) => tagSet.add(tag),
    setNote(html: string) { this.note = html; },
    getNote() { return this.note; },
    saveTx: async function () { this.saved = true; }
  };
}

const candidates: Candidate[] = [
  { label: 'Young’s modulus', type: 'phrase', sourceText: 'The Young’s modulus is high.', sourceIndex: 1 },
  { label: 'LCE', type: 'word', sourceText: 'LCE matrix.', sourceIndex: 2 }
];

test('creates a tagged compact candidate review note with source context', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => null },
    Item: function () { return created; }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [] }, candidates);

  assert.equal(note.parentID, 7);
  assert.ok(note.hasTag(CANDIDATE_TAG));
  assert.match(note.note, /단어장 후보 \(2\)/);
  assert.match(note.note, /data-vocab-flow-candidates="review"/);
  assert.match(note.note, /Review before translation/);
  assert.match(note.note, /필요한 용어만 최종 단어장으로 보내기 위한 검토 단계/);
  assert.match(note.note, /번역 보조 기능은 후보 검토를 대체하지 않습니다/);
  assert.match(note.note, /<th>용어 후보 \(Term candidate\)<\/th><th>저장 여부 \(Keep\?\)<\/th><th>밑줄 문맥 \(Context\)<\/th>/);
  assert.match(note.note, /Young’s modulus/);
  assert.match(note.note, /The Young’s modulus is high\./);
  assert.match(note.note, /data-vocab-flow-type="phrase"/);
  assert.match(note.note, /data-vocab-flow-role="decision">저장<\/td>/);
  assert.doesNotMatch(note.note, /<th>Type<\/th>/);
  assert.doesNotMatch(note.note, /<td>candidate<\/td>/);
  assert.doesNotMatch(note.note, /data-vocab-flow-role="decision">포함<\/td>/);
});

test('truncates long source context in the candidate review table', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => null },
    Item: function () { return created; }
  };
  const longSource = `${'a'.repeat(200)} target`;

  const note = await writeCandidateNote({ id: 7, getNotes: () => [] }, [
    { label: 'target', type: 'word', sourceText: longSource, sourceIndex: 1 }
  ]);

  assert.match(note.note, /aaa\.\.\.<\/td>/);
  assert.doesNotMatch(note.note, new RegExp(longSource));
});

test('marks candidate color scope in the candidate review note', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => null },
    Item: function () { return created; }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [] }, candidates, { scope: 'color', color: '#a28ae5' });

  assert.match(note.note, /data-vocab-flow-scope="color"/);
  assert.match(note.note, /보라 후보 색상/);
  assert.match(note.note, /#a28ae5/);
});

test('marks vocab tag scope in the candidate review note', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => null },
    Item: function () { return created; }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [] }, candidates, { scope: 'tag', tagName: 'vocab' });

  assert.match(note.note, /data-vocab-flow-scope="tag"/);
  assert.match(note.note, /vocab 태그/);
});

test('marks all-underline scope in the candidate review note', async () => {
  const created = fakeNote();
  (globalThis as any).Zotero = {
    Items: { get: () => null },
    Item: function () { return created; }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [] }, candidates, { scope: 'all' });

  assert.match(note.note, /data-vocab-flow-scope="all"/);
  assert.match(note.note, /모든 밑줄/);
});

test('updates the existing candidate note and preserves excluded candidates', async () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<h2>Vocab candidates (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="their" data-vocab-flow-state="excluded">',
    '<td>their</td><td>word</td><td>excluded</td><td>old source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [99] }, [
    { label: 'their', type: 'word', sourceText: 'their shell', sourceIndex: 1 },
    { label: 'shell', type: 'word', sourceText: 'their shell', sourceIndex: 1 }
  ]);

  assert.equal(note, existing);
  assert.match(note.note, /data-vocab-flow-candidate="their" data-vocab-flow-state="excluded"/);
  assert.match(note.note, /data-vocab-flow-candidate="shell" data-vocab-flow-state="candidate"/);
});

test('updates an existing candidate note that has the ownership marker even if the tag is missing', async () => {
  const existing = fakeNote();
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<h2>Vocab candidates (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="their" data-vocab-flow-state="excluded">',
    '<td>their</td><td>word</td><td>excluded</td><td>old source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [99] }, [
    { label: 'their', type: 'word', sourceText: 'their shell', sourceIndex: 1 }
  ]);

  assert.equal(note, existing);
  assert.ok(note.hasTag(CANDIDATE_TAG));
  assert.match(note.note, /data-vocab-flow-candidate="their" data-vocab-flow-state="excluded"/);
});

test('treats an edited Korean decision cell as an exclusion on rerun', async () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<h2>단어장 후보 (1)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="their" data-vocab-flow-state="candidate">',
    '<td data-vocab-flow-role="candidate">their</td>',
    '<td data-vocab-flow-role="decision">제외</td>',
    '<td data-vocab-flow-role="source">old source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [99] }, [
    { label: 'their', type: 'word', sourceText: 'their shell', sourceIndex: 1 }
  ]);

  assert.match(note.note, /data-vocab-flow-candidate="their" data-vocab-flow-state="excluded"/);
  assert.match(note.note, /data-vocab-flow-role="decision">제외<\/td>/);
  assert.doesNotMatch(note.note, /data-vocab-flow-role="decision">저장<\/td>/);
});

test('reads 저장 as the active decision token', () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="LCE matrix" data-vocab-flow-state="excluded">',
    '<td data-vocab-flow-role="candidate">LCE matrix</td>',
    '<td data-vocab-flow-role="decision">저장</td>',
    '<td data-vocab-flow-role="source">source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  assert.deepEqual(readAcceptedCandidateLabels({ id: 7, getNotes: () => [99] }), ['LCE matrix']);
});

test('keeps old four-cell candidate notes readable', () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="LCE matrix" data-vocab-flow-state="candidate">',
    '<td>LCE matrix</td><td>phrase</td><td>candidate</td><td>source</td></tr>',
    '<tr data-vocab-flow-candidate="their" data-vocab-flow-state="candidate">',
    '<td>their</td><td>word</td><td>excluded</td><td>source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  assert.deepEqual(readAcceptedCandidateLabels({ id: 7, getNotes: () => [99] }), ['LCE matrix']);
});

test('accepts Korean and short exclusion tokens in the Decision cell', async () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<h2>Vocab candidates (2)</h2>',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="their" data-vocab-flow-state="candidate">',
    '<td>their</td><td>word</td><td>제외</td><td>old source</td></tr>',
    '<tr data-vocab-flow-candidate="shell" data-vocab-flow-state="candidate">',
    '<td>shell</td><td>word</td><td>x</td><td>old source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) },
    Item: function () { throw new Error('should not create a new note'); }
  };

  const note = await writeCandidateNote({ id: 7, getNotes: () => [99] }, [
    { label: 'their', type: 'word', sourceText: 'their shell', sourceIndex: 1 },
    { label: 'shell', type: 'word', sourceText: 'their shell', sourceIndex: 1 }
  ]);

  assert.match(note.note, /data-vocab-flow-candidate="their" data-vocab-flow-state="excluded"/);
  assert.match(note.note, /data-vocab-flow-candidate="shell" data-vocab-flow-state="excluded"/);
});

test('reads only non-excluded candidate labels for final acceptance', () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="LCE matrix" data-vocab-flow-state="candidate">',
    '<td>LCE matrix</td><td>phrase</td><td>candidate</td><td>source</td></tr>',
    '<tr data-vocab-flow-candidate="their" data-vocab-flow-state="candidate">',
    '<td>their</td><td>word</td><td>excluded</td><td>source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => (id === 99 ? existing : null) }
  };

  assert.deepEqual(readAcceptedCandidateLabels({ id: 7, getNotes: () => [99] }), ['LCE matrix']);
});

test('discards the generated candidate note after final acceptance', async () => {
  const existing = fakeNote([CANDIDATE_TAG]);
  (existing as any).id = 99;
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="LCE matrix" data-vocab-flow-state="candidate">',
    '<td>LCE matrix</td><td>phrase</td><td>candidate</td><td>source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  const trashed: number[] = [];
  (globalThis as any).Zotero = {
    Items: {
      get: (id: number) => (id === 99 ? existing : null),
      trashTx: async (id: number) => { trashed.push(id); }
    }
  };

  await discardCandidateNote({ id: 7, getNotes: () => [99] });

  assert.deepEqual(trashed, [99]);
});

test('discards a generated candidate note with the ownership marker even if the tag is missing', async () => {
  const existing = fakeNote();
  (existing as any).id = 99;
  existing.note = [
    '<section data-vocab-flow-candidates="review">',
    '<table><tbody>',
    '<tr data-vocab-flow-candidate="LCE matrix" data-vocab-flow-state="candidate">',
    '<td>LCE matrix</td><td>phrase</td><td>candidate</td><td>source</td></tr>',
    '</tbody></table>',
    '</section>'
  ].join('');
  const trashed: number[] = [];
  (globalThis as any).Zotero = {
    Items: {
      get: (id: number) => (id === 99 ? existing : null),
      trashTx: async (id: number) => { trashed.push(id); }
    }
  };

  await discardCandidateNote({ id: 7, getNotes: () => [99] });

  assert.deepEqual(trashed, [99]);
});
