import { Candidate } from './candidateNoteWriter';

const LATIN = /\p{Script=Latin}/u;
const TECHNICAL_ACRONYM = /^[A-Z][A-Za-z0-9-]*s?$/;
const MALFORMED_FRAGMENTS = new Set(['stiffn', 'ncreasing', 'flippin', 'ntwi', 'ntw', 'valance', 'yeff']);
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'bars',
  'be',
  'been',
  'being',
  'between',
  'black',
  'by',
  'calculated',
  'different',
  'changed',
  'elements',
  'enhance',
  'error',
  'for',
  'from',
  'arrows',
  'he',
  'her',
  'his',
  'in',
  'is',
  'indicate',
  'it',
  'its',
  'numbers',
  'of',
  'on',
  'or',
  'our',
  'samples',
  'stable',
  'state',
  'that',
  'the',
  'their',
  'these',
  'this',
  'those',
  'to',
  'up',
  'used',
  'remained',
  'we',
  'were',
  'while',
  'with'
]);

const PHRASE_PATTERNS = [
  /\bliquid\s+crystal\s+elastomers?\b/giu,
  /\bYoung[’']s\s+modulus\b/giu,
  /\bAshby\s+plot\b/giu,
  /\bLCE\s+matrix\b/gu,
  /\bhigh\s+stiffness\b/giu,
  /\bstandard\s+deviation\b/giu,
  /\bmodulus-to-density\b/giu,
  /\bstrength-to-density\b/giu
];

export function generateVocabCandidates(rawTexts: string[]): Candidate[] {
  const candidates: ScoredCandidate[] = [];
  const seen = new Set<string>();

  rawTexts.forEach((raw, index) => {
    if (!raw?.trim()) return;
    const sourceIndex = index + 1;
    const sourceText = normalizeWhitespace(dehyphenateLineWraps(raw));

    for (const phrase of extractPhrases(sourceText)) {
      pushCandidate(candidates, seen, {
        label: phrase,
        type: 'phrase',
        sourceText,
        sourceIndex,
        sourceOffset: sourceText.toLowerCase().indexOf(phrase.toLowerCase())
      });
    }

    for (const word of extractWords(sourceText)) {
      if (phraseAlreadyCovers(word, candidates)) continue;
      pushCandidate(candidates, seen, {
        label: word,
        type: 'word',
        sourceText,
        sourceIndex,
        sourceOffset: sourceText.toLowerCase().indexOf(word.toLowerCase())
      });
    }
  });

  return candidates
    .sort((left, right) => (
      rank(left) - rank(right)
      || left.sourceIndex - right.sourceIndex
      || left.sourceOffset - right.sourceOffset
    ))
    .map(({ sourceOffset: _sourceOffset, ...candidate }) => candidate);
}

interface ScoredCandidate extends Candidate {
  sourceOffset: number;
}

function pushCandidate(candidates: ScoredCandidate[], seen: Set<string>, candidate: ScoredCandidate): void {
  const key = candidate.label.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(candidate);
}

function rank(candidate: Candidate): number {
  if (/^LCE\s+matrix$/i.test(candidate.label)) return 0;
  if (TECHNICAL_ACRONYM.test(candidate.label)) return 1;
  if (/^Young[’']s\s+modulus$/i.test(candidate.label)) return 2;
  return 3;
}

function extractPhrases(sourceText: string): string[] {
  const phrases: string[] = [];
  for (const pattern of PHRASE_PATTERNS) {
    for (const match of sourceText.matchAll(pattern)) {
      phrases.push(normalizePhrase(match[0]));
    }
  }
  return phrases;
}

function extractWords(sourceText: string): string[] {
  const words: string[] = [];
  for (const rawToken of sourceText.split(/\s+/)) {
    const token = trimPunctuation(rawToken);
    if (!isUsefulWord(token)) continue;
    words.push(token);
  }
  return words;
}

function dehyphenateLineWraps(text: string): string {
  return text.replace(/-\s*\n\s*/g, '');
}

function isUsefulWord(token: string): boolean {
  if (token.length < 2) return false;
  if (!LATIN.test(token)) return false;
  const key = token.toLowerCase();
  if (STOPWORDS.has(key)) return false;
  if (MALFORMED_FRAGMENTS.has(key)) return false;
  if (/^\d/.test(token)) return false;
  if (token.length <= 3 && !TECHNICAL_ACRONYM.test(token)) return false;
  if (/^[a-z]+$/.test(token) && /(?:n|pin|ffn)$/.test(token) && token.length < 8) return false;
  return true;
}

function phraseAlreadyCovers(word: string, candidates: Candidate[]): boolean {
  const key = word.toLowerCase();
  return candidates.some((candidate) => (
    candidate.type === 'phrase'
    && candidate.label.toLowerCase().split(/\s+/).includes(key)
  ));
}

function normalizePhrase(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function trimPunctuation(token: string): string {
  return token.replace(/^[^\p{Script=Latin}]+/u, '').replace(/[^\p{Script=Latin}]+$/u, '');
}
