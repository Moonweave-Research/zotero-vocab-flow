import { AcceptedCandidate, discardCandidateNote as defaultDiscarder, readAcceptedCandidates as defaultReader } from './candidateNoteWriter';
import { VocabTermInput, writeVocabNote as defaultWriter } from './noteWriter';
import { toast as defaultToast } from './notify';

interface Deps {
  readAcceptedCandidates: (item: any) => AcceptedCandidate[];
  writeVocabNote: (parent: any, words: VocabTermInput[]) => Promise<any>;
  discardCandidateNote: (parent: any) => Promise<void>;
  toast: (message: string) => void;
}

export type AcceptResult =
  | { status: 'accepted'; wordCount: number }
  | { status: 'empty' };

const DEFAULT_DEPS: Deps = {
  readAcceptedCandidates: defaultReader,
  writeVocabNote: defaultWriter,
  discardCandidateNote: defaultDiscarder,
  toast: defaultToast
};

export async function acceptCandidatesForItem(item: any, deps: Deps = DEFAULT_DEPS, options: { notify?: boolean } = { notify: true }): Promise<AcceptResult> {
  const candidates = deps.readAcceptedCandidates(item);
  if (!candidates.length) {
    if (options.notify !== false) deps.toast('확정할 단어 후보가 없습니다');
    return { status: 'empty' };
  }

  await deps.writeVocabNote(item, candidates);
  await deps.discardCandidateNote(item);
  if (options.notify !== false) deps.toast(`${candidates.length}개 후보를 단어장에 저장했습니다`);
  return { status: 'accepted', wordCount: candidates.length };
}
