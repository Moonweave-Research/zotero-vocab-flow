import test from 'node:test';
import assert from 'node:assert/strict';
import { extractForItem } from '../src/vocabExtractor';

function deps(words: string[]) {
  const calls = { wrote: null as string[] | null, toasts: [] as string[] };
  return {
    calls,
    readUnderlineTexts: () => words.map((w) => w),
    extractWords: (texts: string[]) => texts,
    writeVocabNote: async (_parent: any, w: string[]) => { calls.wrote = w; },
    toast: (msg: string) => calls.toasts.push(msg)
  };
}

test('writes note and toasts count when words found', async () => {
  const d = deps(['polymer', 'actuator']);
  await extractForItem({ id: 1 }, d);
  assert.deepEqual(d.calls.wrote, ['polymer', 'actuator']);
  assert.equal(d.calls.toasts.length, 1);
  assert.match(d.calls.toasts[0], /2/);
});

test('does not write note and toasts when zero words after filter', async () => {
  const d = deps([]);
  await extractForItem({ id: 1 }, d);
  assert.equal(d.calls.wrote, null);
  assert.equal(d.calls.toasts.length, 1);
});
