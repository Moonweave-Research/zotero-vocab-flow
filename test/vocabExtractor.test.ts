import test from 'node:test';
import assert from 'node:assert/strict';
import { extractForItem } from '../src/vocabExtractor';
import { Candidate } from '../src/candidateNoteWriter';

function deps(candidates: Candidate[]) {
  const calls = { wrote: null as Candidate[] | null, discarded: false, readOptions: null as any, writeOptions: null as any, toasts: [] as string[] };
  return {
    calls,
    readUnderlineTexts: (_item: any, options?: any) => {
      calls.readOptions = options;
      return candidates.map((candidate) => candidate.sourceText);
    },
    generateCandidates: () => candidates,
    writeCandidateNote: async (_parent: any, generated: Candidate[], options?: any) => {
      calls.wrote = generated;
      calls.writeOptions = options ?? null;
      return { id: 99 };
    },
    discardCandidateNote: async () => {
      calls.discarded = true;
      return calls.discarded;
    },
    toast: (msg: string) => calls.toasts.push(msg)
  };
}

test('writes candidate note and toasts count when candidates found', async () => {
  const d = deps([
    { label: 'polymer actuator', type: 'phrase', sourceText: 'polymer actuator', sourceIndex: 1 }
  ]);
  const result = await extractForItem({ id: 1 }, d);
  assert.deepEqual(d.calls.wrote?.map((candidate) => candidate.label), ['polymer actuator']);
  assert.deepEqual(result, {
    status: 'candidates',
    candidateCount: 1,
    annotationCount: 1,
    noteID: 99
  });
  assert.deepEqual(d.calls.readOptions, { scope: 'color' });
  assert.deepEqual(d.calls.writeOptions, { scope: 'color' });
  assert.equal(d.calls.toasts.length, 1);
  assert.match(d.calls.toasts[0], /1/);
  assert.match(d.calls.toasts[0], /후보/);
});

test('passes all-underline scope to the candidate note writer', async () => {
  const d = deps([
    { label: 'polymer actuator', type: 'phrase', sourceText: 'polymer actuator', sourceIndex: 1 }
  ]);
  await extractForItem({ id: 1 }, d, { scope: 'all' });
  assert.deepEqual(d.calls.writeOptions, { scope: 'all' });
});

test('passes color and tag options through the reader and candidate note writer', async () => {
  const d = deps([
    { label: 'polymer actuator', type: 'phrase', sourceText: 'polymer actuator', sourceIndex: 1 }
  ]);
  await extractForItem({ id: 1 }, d, { scope: 'color', color: '#a28ae5' });
  assert.deepEqual(d.calls.readOptions, { scope: 'color', color: '#a28ae5' });
  assert.deepEqual(d.calls.writeOptions, { scope: 'color', color: '#a28ae5' });

  const tagged = deps([
    { label: 'CNTs', type: 'word', sourceText: 'CNTs', sourceIndex: 1 }
  ]);
  await extractForItem({ id: 1 }, tagged, { scope: 'tag', tagName: 'vocab' });
  assert.deepEqual(tagged.calls.readOptions, { scope: 'tag', tagName: 'vocab' });
  assert.deepEqual(tagged.calls.writeOptions, { scope: 'tag', tagName: 'vocab' });
});

test('does not write note and toasts when zero candidates after filter', async () => {
  const d = deps([]);
  const result = await extractForItem({ id: 1 }, d);
  assert.deepEqual(result, { status: 'empty', annotationCount: 0, cleanedCandidateNote: true });
  assert.equal(d.calls.wrote, null);
  assert.equal(d.calls.toasts.length, 1);
});

test('discards the active candidate note when rerun finds zero candidates', async () => {
  const d = deps([]);
  await extractForItem({ id: 1 }, d);
  assert.equal(d.calls.discarded, true);
});
