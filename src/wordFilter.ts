// Turns raw annotation strings into a deduped list of candidate words.
// No lemmatization or dictionary lookup; only a small stopword filter.

const LATIN = /\p{Script=Latin}/u; // Latin script only (café, Förster); excludes ×, ÷, 한글, 그리스
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'of',
  'on',
  'or',
  'the',
  'to',
  'used',
  'with'
]);

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
      if (STOPWORDS.has(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(token);
    }
  }

  return result;
}

// Strip leading/trailing punctuation; keep internal hyphen and apostrophe.
function trimPunctuation(token: string): string {
  return token.replace(/^[^\p{Script=Latin}]+/u, '').replace(/[^\p{Script=Latin}]+$/u, '');
}
