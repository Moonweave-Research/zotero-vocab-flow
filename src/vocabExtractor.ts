import { readUnderlineTexts as defaultReader } from './annotationReader';
import { extractWords as defaultFilter } from './wordFilter';
import { writeVocabNote as defaultWriter } from './noteWriter';
import { toast as defaultToast } from './notify';

interface Deps {
  readUnderlineTexts: (item: any) => string[];
  extractWords: (texts: string[]) => string[];
  writeVocabNote: (parent: any, words: string[]) => Promise<any>;
  toast: (message: string) => void;
}

const DEFAULT_DEPS: Deps = {
  readUnderlineTexts: defaultReader,
  extractWords: defaultFilter,
  writeVocabNote: defaultWriter,
  toast: defaultToast
};

export async function extractForItem(item: any, deps: Deps = DEFAULT_DEPS): Promise<void> {
  const texts = deps.readUnderlineTexts(item);
  const words = deps.extractWords(texts);

  if (words.length === 0) {
    deps.toast('밑줄 친 단어가 없습니다');
    return;
  }

  await deps.writeVocabNote(item, words);
  deps.toast(`${words.length}개 단어를 단어장 노트에 저장했습니다`);
}
