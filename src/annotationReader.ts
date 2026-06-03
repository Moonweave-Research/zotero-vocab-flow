// Reads underline-annotation text from all PDF attachments of an item.
// Spec §4.2, §4.6 (2)(3): all PDFs merged, trashed excluded, sorted by sortIndex.

export const DEFAULT_CANDIDATE_COLOR = '#5fb236';
export const DEFAULT_CANDIDATE_TAG = 'vocab';
const CANDIDATE_COLOR_LABELS: Record<string, string> = {
  '#5fb236': '초록',
  '#ffd400': '노란',
  '#2ea8e5': '파란',
  '#a28ae5': '보라',
  '#ff6666': '빨간',
  '#aaaaaa': '회색'
};

export type UnderlineReadScope = 'color' | 'tag' | 'all';

export interface ReadUnderlineOptions {
  scope?: UnderlineReadScope;
  color?: string;
  tagName?: string;
}

export function describeCandidateColor(color: string = DEFAULT_CANDIDATE_COLOR): string {
  const normalized = normalizeColor(color);
  return CANDIDATE_COLOR_LABELS[normalized] ? `${CANDIDATE_COLOR_LABELS[normalized]} 후보 색상` : `후보 색상(${normalized})`;
}

export function readUnderlineTexts(item: any, options: ReadUnderlineOptions = { scope: 'color' }): string[] {
  const attachmentIDs: number[] = item.getAttachments() ?? [];
  const texts: string[] = [];
  const scope = options.scope ?? 'color';
  const color = normalizeColor(options.color ?? DEFAULT_CANDIDATE_COLOR);
  const tagName = normalizeTag(options.tagName ?? DEFAULT_CANDIDATE_TAG);

  for (const id of attachmentIDs) {
    const att = Zotero.Items.get(id);
    if (!att?.isPDFAttachment?.()) continue;
    const annotations = att.getAnnotations(false) ?? []; // includeTrashed = false
    const underlines: any[] = [];
    for (const a of annotations) {
      if (a.annotationType !== 'underline') continue;
      if (!a.annotationText || !a.annotationText.trim()) continue;
      if (scope === 'color' && !isColorUnderline(a, color)) continue;
      if (scope === 'tag' && !hasAnnotationTag(a, tagName)) continue;
      underlines.push(a);
    }
    underlines.sort((left, right) => {
      const a = String(left.annotationSortIndex ?? '');
      const b = String(right.annotationSortIndex ?? '');
      return a < b ? -1 : a > b ? 1 : 0;
    });
    texts.push(...underlines.map((a) => a.annotationText));
  }

  return texts;
}

function isColorUnderline(annotation: any, expectedColor: string): boolean {
  return normalizeColor(annotation.annotationColor ?? annotation.color ?? '') === expectedColor;
}

function hasAnnotationTag(annotation: any, expectedTag: string): boolean {
  return getAnnotationTags(annotation).some((tag) => normalizeTag(tag) === expectedTag);
}

function getAnnotationTags(annotation: any): string[] {
  const rawTags = annotation.getTags?.() ?? annotation.tags ?? annotation.annotationTags ?? [];
  if (!Array.isArray(rawTags)) return [];
  return rawTags.map((tag: any) => String(tag?.tag ?? tag?.name ?? tag));
}

function normalizeColor(color: any): string {
  return String(color ?? '').trim().toLowerCase();
}

function normalizeTag(tag: any): string {
  return String(tag ?? '').trim().toLowerCase();
}
