import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptCandidatesForItem } from '../src/candidateAccepter';

test('writes accepted candidates with source context to the final vocab note', async () => {
  const toasts: string[] = [];
  const written: unknown[][] = [];
  let discarded = false;
  const accepted = [
    { label: 'LCE matrix', type: 'phrase' as const, sourceText: 'The LCE matrix stiffens.', sourceIndex: 2 },
    { label: 'CNTs', type: 'word' as const, sourceText: 'CNTs align under strain.', sourceIndex: 5 }
  ];

  const result = await acceptCandidatesForItem({ id: 7 }, {
    readAcceptedCandidates: () => accepted,
    writeVocabNote: async (_parent, words) => { written.push(words); return { id: 199 }; },
    discardCandidateNote: async () => { discarded = true; },
    toast: (message) => { toasts.push(message); }
  });

  assert.deepEqual(result, { status: 'accepted', wordCount: 2, noteID: 199 });
  assert.deepEqual(written, [accepted]);
  assert.equal(discarded, true);
  assert.equal(toasts[0], '2개 후보를 단어장에 저장했습니다');
});

test('does not create a final note when no candidates are accepted', async () => {
  let wrote = false;
  const toasts: string[] = [];

  const result = await acceptCandidatesForItem({ id: 7 }, {
    readAcceptedCandidates: () => [],
    writeVocabNote: async () => { wrote = true; return {}; },
    discardCandidateNote: async () => { throw new Error('should not discard candidate note'); },
    toast: (message) => { toasts.push(message); }
  });

  assert.deepEqual(result, { status: 'empty' });
  assert.equal(wrote, false);
  assert.equal(toasts[0], '확정할 단어 후보가 없습니다');
});
