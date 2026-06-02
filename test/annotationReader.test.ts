import test from 'node:test';
import assert from 'node:assert/strict';
import { readUnderlineTexts } from '../src/annotationReader';

function annotation(type: string, text: string, sortIndex: string) {
  return { annotationType: type, annotationText: text, annotationSortIndex: sortIndex };
}

function setupZotero(attachmentsById: Record<number, any>) {
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => attachmentsById[id] }
  };
}

test('collects only underline annotations, sorted by sortIndex, across multiple PDFs', () => {
  const pdf1 = {
    isPDFAttachment: () => true,
    getAnnotations: (includeTrashed: boolean) => {
      assert.equal(includeTrashed, false); // spec §4.6 (3)
      return [annotation('underline', 'beta', '00002'), annotation('highlight', 'IGNORED', '00001')];
    }
  };
  const pdf2 = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', 'alpha', '00001')]
  };
  setupZotero({ 10: pdf1, 11: pdf2 });
  const item = { getAttachments: () => [10, 11] };

  assert.deepEqual(readUnderlineTexts(item), ['alpha', 'beta']);
});

test('skips non-PDF attachments and empty annotation text', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', '  ', '00001'), annotation('underline', 'word', '00002')]
  };
  const epub = { isPDFAttachment: () => false, getAnnotations: () => [annotation('underline', 'X', '00001')] };
  setupZotero({ 20: pdf, 21: epub });
  const item = { getAttachments: () => [20, 21] };

  assert.deepEqual(readUnderlineTexts(item), ['word']);
});
