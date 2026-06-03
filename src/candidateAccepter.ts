import { discardCandidateNote as defaultDiscarder, readAcceptedCandidateLabels as defaultReader } from './candidateNoteWriter';
import { writeVocabNote as defaultWriter } from './noteWriter';
import { toast as defaultToast } from './notify';

interface Deps {
  readAcceptedCandidateLabels: (item: any) => string[];
  writeVocabNote: (parent: any, words: string[]) => Promise<any>;
  discardCandidateNote: (parent: any) => Promise<void>;
  toast: (message: string) => void;
}

export type AcceptResult =
  | { status: 'accepted'; wordCount: number }
  | { status: 'empty' };

const DEFAULT_DEPS: Deps = {
  readAcceptedCandidateLabels: defaultReader,
  writeVocabNote: defaultWriter,
  discardCandidateNote: defaultDiscarder,
  toast: defaultToast
};

export async function acceptCandidatesForItem(item: any, deps: Deps = DEFAULT_DEPS, options: { notify?: boolean } = { notify: true }): Promise<AcceptResult> {
  const words = deps.readAcceptedCandidateLabels(item);
  if (!words.length) {
    if (options.notify !== false) deps.toast('확정할 단어 후보가 없습니다');
    return { status: 'empty' };
  }

  await deps.writeVocabNote(item, words);
  await deps.discardCandidateNote(item);
  if (options.notify !== false) deps.toast(`${words.length}개 후보를 단어장에 저장했습니다`);
  return { status: 'accepted', wordCount: words.length };
}
