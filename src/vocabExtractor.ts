import { ReadUnderlineOptions, readUnderlineTexts as defaultReader } from './annotationReader';
import { generateVocabCandidates as defaultCandidateGenerator } from './candidateExtractor';
import { Candidate, writeCandidateNote as defaultCandidateWriter } from './candidateNoteWriter';
import { toast as defaultToast } from './notify';

interface Deps {
  readUnderlineTexts: (item: any, options?: ReadUnderlineOptions) => string[];
  generateCandidates: (texts: string[]) => Candidate[];
  writeCandidateNote: (parent: any, candidates: Candidate[], options?: ReadUnderlineOptions) => Promise<any>;
  toast: (message: string) => void;
}

export type ExtractResult =
  | { status: 'candidates'; candidateCount: number }
  | { status: 'empty' };

interface ExtractOptions {
  notify?: boolean;
  scope?: ReadUnderlineOptions['scope'];
  color?: string;
  tagName?: string;
}

const DEFAULT_DEPS: Deps = {
  readUnderlineTexts: defaultReader,
  generateCandidates: defaultCandidateGenerator,
  writeCandidateNote: defaultCandidateWriter,
  toast: defaultToast
};

export async function extractForItem(item: any, deps: Deps = DEFAULT_DEPS, options: ExtractOptions = { notify: true }): Promise<ExtractResult> {
  const readOptions = buildReadOptions(options);
  const texts = deps.readUnderlineTexts(item, readOptions);
  const candidates = deps.generateCandidates(texts);

  if (candidates.length === 0) {
    if (options.notify !== false) {
      deps.toast(summarizeEmpty(readOptions));
    }
    return { status: 'empty' };
  }

  await deps.writeCandidateNote(item, candidates, readOptions);
  if (options.notify !== false) deps.toast(`${candidates.length}개 단어 후보를 검토 노트에 저장했습니다`);
  return { status: 'candidates', candidateCount: candidates.length };
}

function buildReadOptions(options: ExtractOptions): ReadUnderlineOptions {
  const scope = options.scope ?? 'color';
  if (scope === 'color') return options.color ? { scope, color: options.color } : { scope };
  if (scope === 'tag') return options.tagName ? { scope, tagName: options.tagName } : { scope };
  return { scope };
}

function summarizeEmpty(options: ReadUnderlineOptions): string {
  if (options.scope === 'color') return '후보 색상 밑줄이 없습니다';
  if (options.scope === 'tag') return `${options.tagName ?? 'vocab'} 태그 밑줄이 없습니다`;
  return '검토할 단어 후보가 없습니다';
}
