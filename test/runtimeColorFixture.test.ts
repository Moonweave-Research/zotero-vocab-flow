import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_CANDIDATE_COLORS } from '../src/annotationReader';

test('runtime color fixture script covers every supported candidate color', () => {
  const script = fs.readFileSync('scripts/zotero-runtime-color-fixture.js', 'utf8');

  for (const color of SUPPORTED_CANDIDATE_COLORS) {
    assert.ok(script.includes(color), `missing fixture color ${color}`);
  }
});
