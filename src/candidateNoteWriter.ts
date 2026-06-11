import type { ReadUnderlineOptions } from './annotationReader';
import { DEFAULT_CANDIDATE_COLOR, DEFAULT_CANDIDATE_TAG, describeCandidateColor } from './annotationReader';

export const CANDIDATE_TAG = '_vocab-candidates';

const CANDIDATE_MARKER = 'data-vocab-flow-candidates="review"';
const CANDIDATE_BLOCK_PATTERN = /<section[^>]*data-vocab-flow-candidates="review"[^>]*>[\s\S]*?<\/section>/;
const SOURCE_CONTEXT_LIMIT = 160;

export interface Candidate {
  label: string;
  type: 'word' | 'phrase';
  sourceText: string;
  sourceIndex: number;
}

export type AcceptedCandidate = Candidate;

interface ExistingCandidateState {
  state: 'candidate' | 'excluded';
  rowHtml: string;
}

interface CandidateNoteOptions {
  scope?: ReadUnderlineOptions['scope'];
  color?: string;
  tagName?: string;
}

export async function writeCandidateNote(parent: any, candidates: Candidate[], options: CandidateNoteOptions = {}): Promise<any> {
  const note = findExistingCandidateNote(parent) ?? createNote(parent);
  const existingHtml = getNoteHtml(note);
  const existingStates = extractExistingStates(existingHtml);
  note.setNote(mergeCandidateBlock(existingHtml, buildCandidateHtml(candidates, existingStates, normalizeOptions(options))));
  if (!note.hasTag(CANDIDATE_TAG)) note.addTag(CANDIDATE_TAG);
  await note.saveTx();
  return note;
}

export function readAcceptedCandidateLabels(parent: any): string[] {
  return readAcceptedCandidates(parent).map((candidate) => candidate.label);
}

export function readAcceptedCandidates(parent: any): AcceptedCandidate[] {
  const note = findExistingCandidateNote(parent);
  if (!note) return [];
  return extractCandidateRows(getNoteHtml(note))
    .filter((row) => row.state === 'candidate')
    .map((row) => ({
      label: row.label,
      type: row.type,
      sourceText: row.sourceText,
      sourceIndex: row.sourceIndex
    }));
}

export function countAcceptedCandidateLabels(parent: any): number {
  return readAcceptedCandidateLabels(parent).length;
}

export async function discardCandidateNote(parent: any): Promise<void> {
  const note = findExistingCandidateNote(parent);
  if (!note) return;
  if (typeof Zotero.Items?.trashTx === 'function') {
    await Zotero.Items.trashTx(note.id);
    return;
  }
  await note.trashTx?.();
}

function findExistingCandidateNote(parent: any): any | null {
  const noteIDs: number[] = parent.getNotes?.() ?? [];
  for (const id of noteIDs) {
    const note: any = Zotero.Items.get(id);
    if (!getNoteHtml(note).includes(CANDIDATE_MARKER)) continue;
    if (!note.hasTag?.(CANDIDATE_TAG)) note.addTag?.(CANDIDATE_TAG);
    return note;
  }
  return null;
}

function createNote(parent: any): any {
  const note = new (Zotero.Item as any)('note');
  note.parentID = parent.id;
  return note;
}

function buildCandidateHtml(candidates: Candidate[], existingStates: Map<string, ExistingCandidateState>, options: Required<CandidateNoteOptions>): string {
  const rows: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = candidate.label.toLowerCase();
    seen.add(key);
    const existing = existingStates.get(key);
    if (existing?.state === 'excluded') {
      rows.push(existing.rowHtml);
      continue;
    }
    rows.push(renderRow(candidate, 'candidate'));
  }

  for (const [key, existing] of existingStates) {
    if (seen.has(key) || existing.state !== 'excluded') continue;
    rows.push(existing.rowHtml);
  }

  const activeCount = rows.filter((row) => row.includes('data-vocab-flow-state="candidate"')).length;
  const scopeText = describeScope(options);
  return [
    `<section data-vocab-flow-candidates="review" data-vocab-flow-scope="${options.scope}">`,
    `<h2>단어장 후보 (${activeCount})</h2>`,
    `<p><strong>Review before translation.</strong> ${scopeText} 필요한 용어만 최종 단어장으로 보내기 위한 검토 단계입니다. 단어장에 넣지 않을 행은 저장 여부(Keep?) 칸을 제외 또는 x로 바꾼 뒤 확정 저장하세요. 한국어 뜻은 최종 단어장에서 직접 입력하거나 선택적으로 자동 채우기를 실행합니다. 번역 보조 기능은 후보 검토를 대체하지 않습니다.</p>`,
    '<table>',
    '<thead><tr><th>용어 후보 (Term candidate)</th><th>저장 여부 (Keep?)</th><th>밑줄 문맥 (Context)</th></tr></thead>',
    `<tbody>${rows.join('')}</tbody>`,
    '</table>',
    '</section>'
  ].join('');
}

function normalizeOptions(options: CandidateNoteOptions): Required<CandidateNoteOptions> {
  return {
    scope: options.scope ?? 'color',
    color: options.color ?? DEFAULT_CANDIDATE_COLOR,
    tagName: options.tagName ?? DEFAULT_CANDIDATE_TAG
  };
}

function describeScope(options: Required<CandidateNoteOptions>): string {
  if (options.scope === 'all') return '범위: 모든 밑줄. 읽기용 밑줄까지 후보에 포함될 수 있습니다.';
  if (options.scope === 'tag') return `범위: ${escapeHtml(options.tagName)} 태그 밑줄. 이 태그가 붙은 밑줄만 포함합니다.`;
  return `범위: ${escapeHtml(describeCandidateColor(options.color))}(${escapeHtml(options.color)}) 밑줄. 선택한 색상의 밑줄만 포함합니다.`;
}

function renderRow(candidate: Candidate, state: 'candidate' | 'excluded'): string {
  const label = escapeHtml(candidate.label);
  const attr = escapeAttribute(candidate.label);
  const decision = state === 'candidate' ? '저장' : '제외';
  const source = escapeHtml(truncateSourceContext(candidate.sourceText));
  const sourceTextAttr = escapeAttribute(candidate.sourceText);
  return [
    `<tr data-vocab-flow-candidate="${attr}" data-vocab-flow-state="${state}" data-vocab-flow-type="${candidate.type}" data-vocab-flow-source-index="${candidate.sourceIndex}" data-vocab-flow-source-text="${sourceTextAttr}">`,
    `<td data-vocab-flow-role="candidate">${label}</td>`,
    `<td data-vocab-flow-role="decision">${decision}</td>`,
    `<td data-vocab-flow-role="source">#${candidate.sourceIndex}: ${source}</td>`,
    '</tr>'
  ].join('');
}

function extractExistingStates(html: string): Map<string, ExistingCandidateState> {
  const states = new Map<string, ExistingCandidateState>();
  for (const row of extractCandidateRows(html)) {
    states.set(row.label.toLowerCase(), {
      state: row.state,
      rowHtml: row.state === 'excluded' ? normalizeExcludedRow(row.rowHtml) : row.rowHtml
    });
  }
  return states;
}

function extractCandidateRows(html: string): Array<AcceptedCandidate & { state: 'candidate' | 'excluded'; rowHtml: string }> {
  const rows: Array<AcceptedCandidate & { state: 'candidate' | 'excluded'; rowHtml: string }> = [];
  const rowPattern = /<tr[^>]*data-vocab-flow-candidate="([^"]*)"[^>]*data-vocab-flow-state="(candidate|excluded)"[^>]*>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    const decision = extractDecision(match[0]) ?? match[2];
    const source = extractSource(match[0]);
    rows.push({
      label: decodeHtml(match[1]),
      type: extractCandidateType(match[0]),
      sourceText: source.sourceText,
      sourceIndex: source.sourceIndex,
      state: decision === 'excluded' ? 'excluded' : 'candidate',
      rowHtml: match[0]
    });
  }
  return rows;
}

function extractCandidateType(rowHtml: string): Candidate['type'] {
  const attr = extractAttribute(rowHtml, 'data-vocab-flow-type');
  if (attr === 'phrase') return 'phrase';
  const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => normalizeCellText(match[1]));
  return cells[1] === 'phrase' ? 'phrase' : 'word';
}

function extractSource(rowHtml: string): Pick<Candidate, 'sourceText' | 'sourceIndex'> {
  const sourceText = extractAttribute(rowHtml, 'data-vocab-flow-source-text');
  const sourceIndexText = extractAttribute(rowHtml, 'data-vocab-flow-source-index');
  if (sourceText) {
    return {
      sourceText,
      sourceIndex: Number.parseInt(sourceIndexText ?? '', 10) || 0
    };
  }

  const roleMatch = rowHtml.match(/<td[^>]*data-vocab-flow-role="source"[^>]*>([\s\S]*?)<\/td>/);
  const sourceCell = roleMatch?.[1] ?? [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1])[3] ?? '';
  const normalized = normalizeCellText(sourceCell);
  const indexMatch = normalized.match(/^#(\d+):\s*(.*)$/);
  if (indexMatch) {
    return {
      sourceText: indexMatch[2],
      sourceIndex: Number.parseInt(indexMatch[1], 10)
    };
  }
  return {
    sourceText: normalized,
    sourceIndex: 0
  };
}

function extractAttribute(html: string, name: string): string | null {
  const match = html.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeHtml(match[1]) : null;
}

function extractDecision(rowHtml: string): 'candidate' | 'excluded' | null {
  const roleMatch = rowHtml.match(/<td[^>]*data-vocab-flow-role="decision"[^>]*>([\s\S]*?)<\/td>/);
  if (roleMatch) {
    const decision = normalizeCellText(roleMatch[1]).toLowerCase();
    if (isExcludedToken(decision)) return 'excluded';
    if (isCandidateToken(decision)) return 'candidate';
    return null;
  }
  const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => normalizeCellText(match[1]));
  const decision = cells[2]?.toLowerCase();
  if (isExcludedToken(decision)) return 'excluded';
  if (isCandidateToken(decision)) return 'candidate';
  return null;
}

function isExcludedToken(value: string | undefined): boolean {
  return ['excluded', 'exclude', '제외', 'x', 'no', 'n', '0', 'false'].includes(value ?? '');
}

function isCandidateToken(value: string | undefined): boolean {
  return ['candidate', 'include', 'included', 'keep', '저장', '포함', '유지', 'yes', 'y', '1', 'true'].includes(value ?? '');
}

function normalizeCellText(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, '')).trim();
}

function normalizeExcludedRow(rowHtml: string): string {
  return rowHtml
    .replace(/data-vocab-flow-state="candidate"/, 'data-vocab-flow-state="excluded"')
    .replace(/(<td[^>]*data-vocab-flow-role="decision"[^>]*>)[\s\S]*?(<\/td>)/, '$1제외$2')
    .replace(/(<td[^>]*>)candidate(<\/td>)/, '$1excluded$2');
}

function truncateSourceContext(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= SOURCE_CONTEXT_LIMIT) return normalized;
  return `${normalized.slice(0, SOURCE_CONTEXT_LIMIT - 3)}...`;
}

function mergeCandidateBlock(existingHtml: string, generatedHtml: string): string {
  if (!existingHtml) return generatedHtml;
  if (CANDIDATE_BLOCK_PATTERN.test(existingHtml)) {
    return existingHtml.replace(CANDIDATE_BLOCK_PATTERN, generatedHtml);
  }
  return generatedHtml;
}

function getNoteHtml(note: any): string {
  return note?.getNote?.() ?? note?.note ?? '';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

function decodeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}
