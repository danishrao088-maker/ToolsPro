// Text Summarizer: ye "nikalne wala" (extractive) tareeqa hai. Ye apne alfaaz nahi likhta,
// balkay text ke sab se ahem jumle chun kar unhein asli tarteeb mein wapis deta hai.

export const SUMMARY_LIMITS = { chars: 200_000, minSentences: 1, maxSentences: 10, defaultSentences: 3 } as const;

const STOP_WORDS = new Set(
  (
    "a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours " +
    "said says say get got one two"
  ).split(" ")
);

const ABBREVIATIONS = ["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "inc", "ltd", "no", "fig", "approx"];
const DOT = "\u0001";

// Jumlon mein todta hai. Mr. / Dr. / e.g. / 3.5 / example.com jaisi jagahon par nahi todta.
export function splitSentences(text: string): string[] {
  let work = text.replace(/\r\n?/g, "\n");
  work = work.replace(new RegExp(`\\b(${ABBREVIATIONS.join("|")})\\.`, "gi"), (_m, word: string) => `${word}${DOT}`);
  work = work.replace(/\b([a-z])\.([a-z])\./gi, (_m, a: string, b: string) => `${a}${DOT}${b}${DOT}`);
  work = work.replace(/(\d)\.(\d)/g, `$1${DOT}$2`);
  // Lookbehind nahi use kiya, taake purane browsers mein bhi chale
  const pieces = (work.match(/[^\n]*?[.!?\u06D4\u061F]+["'\u201D\u2019)\]]*(?=\s|$)|[^\n]+/gu) ?? [])
    .map((piece) => piece.split(DOT).join(".").replace(/\s+/g, " ").trim())
    .filter((piece) => /[\p{L}\p{N}]/u.test(piece));
  return pieces;
}

function wordsOf(sentence: string): string[] {
  return sentence.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'\u2019-]*/gu) ?? [];
}

export function countWords(text: string): number {
  return wordsOf(text).length;
}

export interface SummaryResult {
  sentences: string[];
  totalSentences: number;
  originalWords: number;
  summaryWords: number;
  alreadyShort: boolean;
}

export type SummaryOutcome = { ok: true; result: SummaryResult } | { ok: false; error: string };

export function summarize(text: string, wanted: number): SummaryOutcome {
  if (text.trim() === "") return { ok: false, error: "Paste or type the text you want to shorten." };
  if (text.length > SUMMARY_LIMITS.chars) return { ok: false, error: `The text is too long. The limit is ${SUMMARY_LIMITS.chars.toLocaleString("en-US")} characters.` };
  const count = Math.floor(wanted);
  if (!Number.isFinite(count) || count < SUMMARY_LIMITS.minSentences || count > SUMMARY_LIMITS.maxSentences) {
    return { ok: false, error: `Choose between ${SUMMARY_LIMITS.minSentences} and ${SUMMARY_LIMITS.maxSentences} sentences.` };
  }

  const sentences = splitSentences(text);
  if (sentences.length === 0) return { ok: false, error: "No sentences were found in the text." };
  const originalWords = countWords(text);

  if (sentences.length <= count) {
    return { ok: true, result: { sentences, totalSentences: sentences.length, originalWords, summaryWords: originalWords, alreadyShort: true } };
  }

  const tokens = sentences.map((sentence) => wordsOf(sentence).filter((word) => word.length > 1 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)));
  const frequency = new Map<string, number>();
  for (const list of tokens) for (const word of list) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const top = Math.max(1, ...frequency.values());

  const scored = sentences.map((sentence, index) => {
    const list = tokens[index]!;
    const length = wordsOf(sentence).length;
    if (list.length === 0 || length < 4) return { index, score: 0 };
    let total = 0;
    for (const word of list) total += (frequency.get(word) ?? 0) / top;
    let score = total / Math.sqrt(list.length);
    if (length > 45) score *= 45 / length; // bahut lambay jumlon ko thora kam number
    if (index === 0) score *= 1.2; // shuru ka jumla aksar mauzu batata hai
    return { index, score };
  });

  const chosen = [...scored].sort((a, b) => b.score - a.score || a.index - b.index).slice(0, count).map((item) => item.index).sort((a, b) => a - b);
  const picked = chosen.map((index) => sentences[index]!);
  return {
    ok: true,
    result: { sentences: picked, totalSentences: sentences.length, originalWords, summaryWords: countWords(picked.join(" ")), alreadyShort: false },
  };
}

export type SummaryFormat = "paragraph" | "bullets";

export function formatSummary(sentences: string[], format: SummaryFormat): string {
  return format === "bullets" ? sentences.map((sentence) => `• ${sentence}`).join("\n") : sentences.join(" ");
}