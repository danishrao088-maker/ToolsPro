export const MAX_KEYWORD_TEXT_LENGTH = 500_000;

export type PhraseValue = "1" | "2" | "3";
export type PhraseLength = 1 | 2 | 3;

export const PHRASE_OPTIONS: { value: PhraseValue; label: string }[] = [
  { value: "1", label: "Single words" },
  { value: "2", label: "Two-word phrases" },
  { value: "3", label: "Three-word phrases" },
];

export const PHRASE_LENGTHS: Record<PhraseValue, PhraseLength> = { "1": 1, "2": 2, "3": 3 };

// Aam English lafz. Urdu ke liye abhi koi list nahi, is liye wahan ye option kuch nahi hatata.
export const STOP_WORDS: ReadonlySet<string> = new Set(
  (
    "a an and are as at be but by can could did do does for from had has have he her his i if in into is it its " +
    "me my no not of on or our she should so than that the their them then there these they this to up was we " +
    "were what when which who will with would you your don't isn't can't won't it's i'm"
  ).split(" ")
);

// Harf ya number se shuru, beech mein apostrophe ki ijazat (don't). \p{L} har zabaan ke harf pakarta hai.
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export interface KeywordOptions {
  phraseLength: PhraseLength;
  ignoreCommonWords: boolean;
  limit: number;
}

export interface KeywordRow {
  phrase: string;
  count: number;
  density: number; // percent
}

export type KeywordAnalysis =
  | { ok: true; totalWords: number; distinctPhrases: number; rows: KeywordRow[] }
  | { ok: false; error: string };

export function analyzeKeywords(text: string, options: KeywordOptions): KeywordAnalysis {
  if (text.length > MAX_KEYWORD_TEXT_LENGTH) {
    return {
      ok: false,
      error: `The text is too long. The maximum is ${MAX_KEYWORD_TEXT_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  const words = (text.toLowerCase().match(WORD_PATTERN) ?? []).map((word) => word.replace(/’/g, "'"));
  const n = options.phraseLength;
  const possible = words.length - n + 1; // is text mein kitne phrases ban sakte hain

  if (possible < 1) return { ok: true, totalWords: words.length, distinctPhrases: 0, rows: [] };

  const counts = new Map<string, number>();
  for (let i = 0; i < possible; i += 1) {
    const first = words[i] ?? "";
    const last = words[i + n - 1] ?? "";
    // Phrase "the cat" jaisa ho to bekaar hai: shuru ya aakhir mein common lafz ho to chhor dete hain
    if (options.ignoreCommonWords && (STOP_WORDS.has(first) || STOP_WORDS.has(last))) continue;
    const phrase = words.slice(i, i + n).join(" ");
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  const rows = [...counts]
    .map(([phrase, count]) => ({ phrase, count, density: (count / possible) * 100 }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, options.limit);

  return { ok: true, totalWords: words.length, distinctPhrases: counts.size, rows };
}