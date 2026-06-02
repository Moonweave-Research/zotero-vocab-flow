// Turns raw annotation strings into a deduped list of candidate words.
// Phase 0 policy: see spec §4.6 (4). No lemmatization, no dictionary.

const LATIN = /[A-Za-zÀ-ɏ]/; // basic Latin + Latin-1/Extended-A (café, Förster)

export function extractWords(rawTexts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawTexts) {
    if (!raw || !raw.trim()) continue;

    // Best-effort: rejoin hyphenation broken across a line break.
    const dehyphenated = raw.replace(/-\s*\n\s*/g, '');

    for (const rawToken of dehyphenated.split(/\s+/)) {
      const token = trimPunctuation(rawToken);
      if (token.length < 2) continue;
      if (!LATIN.test(token)) continue;

      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(token);
    }
  }

  return result;
}

// Strip leading/trailing punctuation; keep internal hyphen and apostrophe.
function trimPunctuation(token: string): string {
  return token.replace(/^[^A-Za-zÀ-ɏ]+/, '').replace(/[^A-Za-zÀ-ɏ]+$/, '');
}
