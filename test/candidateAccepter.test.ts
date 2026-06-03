import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptCandidatesForItem } from '../src/candidateAccepter';

test('writes only accepted candidate labels to the final vocab note', async () => {
  const toasts: string[] = [];
  const written: string[][] = [];
  let discarded = false;

  const result = await acceptCandidatesForItem({ id: 7 }, {
    readAcceptedCandidateLabels: () => ['LCE matrix', 'CNTs'],
    writeVocabNote: async (_parent, words) => { written.push(words); return {}; },
    discardCandidateNote: async () => { discarded = true; },
    toast: (message) => { toasts.push(message); }
  });

  assert.deepEqual(result, { status: 'accepted', wordCount: 2 });
  assert.deepEqual(written, [['LCE matrix', 'CNTs']]);
  assert.equal(discarded, true);
  assert.equal(toasts[0], '2개 후보를 단어장에 저장했습니다');
});

test('does not create a final note when no candidates are accepted', async () => {
  let wrote = false;
  const toasts: string[] = [];

  const result = await acceptCandidatesForItem({ id: 7 }, {
    readAcceptedCandidateLabels: () => [],
    writeVocabNote: async () => { wrote = true; return {}; },
    discardCandidateNote: async () => { throw new Error('should not discard candidate note'); },
    toast: (message) => { toasts.push(message); }
  });

  assert.deepEqual(result, { status: 'empty' });
  assert.equal(wrote, false);
  assert.equal(toasts[0], '확정할 단어 후보가 없습니다');
});
