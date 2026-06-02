// Reads underline-annotation text from all PDF attachments of an item.
// Spec §4.2, §4.6 (2)(3): all PDFs merged, trashed excluded, sorted by sortIndex.

export function readUnderlineTexts(item: any): string[] {
  const attachmentIDs: number[] = item.getAttachments() ?? [];
  const underlines: any[] = [];

  for (const id of attachmentIDs) {
    const att = Zotero.Items.get(id);
    if (!att?.isPDFAttachment?.()) continue;
    const annotations = att.getAnnotations(false) ?? []; // includeTrashed = false
    for (const a of annotations) {
      if (a.annotationType !== 'underline') continue;
      if (!a.annotationText || !a.annotationText.trim()) continue;
      underlines.push(a);
    }
  }

  underlines.sort((left, right) => {
    const a = String(left.annotationSortIndex ?? '');
    const b = String(right.annotationSortIndex ?? '');
    return a < b ? -1 : a > b ? 1 : 0;
  });

  return underlines.map((a) => a.annotationText);
}
