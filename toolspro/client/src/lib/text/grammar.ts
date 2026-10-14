// Free Grammar Checker: niyam par mabni (rule-based) jaanch. Ye AI nahi hai aur matlab nahi samajhta.
// Sirf aam ghaltiyan pakarta hai. Har niyam seedhi lakeer mein chalta hai, is liye bare matan par bhi atakta nahi.

export type IssueKind = "spelling" | "grammar" | "punctuation" | "style";

export interface Issue {
  id: number;
  start: number;
  end: number;
  kind: IssueKind;
  rule: string;
  message: string;
  replacement: string | null; // null = khud theek karna hoga
}

export const GRAMMAR_LIMITS = { chars: 50_000, shown: 200, longSentenceWords: 40 } as const;

export const KIND_LABEL: Record<IssueKind, string> = {
  spelling: "Spelling",
  grammar: "Grammar",
  punctuation: "Punctuation",
  style: "Style",
};

type Draft = Omit<Issue, "id">;
type Add = (start: number, end: number, kind: IssueKind, rule: string, message: string, replacement: string | null) => void;

function matchCase(original: string, replacement: string): string {
  if (original.length > 1 && original === original.toUpperCase() && original !== original.toLowerCase()) return replacement.toUpperCase();
  const first = original[0] ?? "";
  if (first !== "" && first !== first.toLowerCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

// ---------- Mehfooz hisse: web address aur email ko nahi chhedte ----------
function protectedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const match of text.matchAll(/\S+/g)) {
    const token = match[0];
    const lower = token.toLowerCase();
    const isUrl = lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("www.");
    const isEmail = token.includes("@") && token.includes(".");
    if (isUrl || isEmail) ranges.push([match.index, match.index + token.length]);
  }
  return ranges;
}

// ---------- Aam spelling ghaltiyan ----------
const MISSPELLINGS: Record<string, string> = {
  alot: "a lot", definately: "definitely", definatly: "definitely", recieve: "receive", recieved: "received", reciept: "receipt",
  seperate: "separate", seperately: "separately", occured: "occurred", occuring: "occurring", occurence: "occurrence", untill: "until",
  wich: "which", teh: "the", adress: "address", beleive: "believe", belive: "believe", wierd: "weird", thier: "their", freind: "friend",
  goverment: "government", enviroment: "environment", tommorow: "tomorrow", tomorow: "tomorrow", accomodate: "accommodate",
  acheive: "achieve", arguement: "argument", begining: "beginning", collegue: "colleague", comming: "coming", conciousness: "consciousness",
  concious: "conscious", dissapear: "disappear", embarass: "embarrass", existance: "existence", foriegn: "foreign", grammer: "grammar",
  happend: "happened", immediatly: "immediately", independant: "independent", knowlege: "knowledge", lenght: "length", liason: "liaison",
  neccessary: "necessary", necesary: "necessary", neccesary: "necessary", noticable: "noticeable", occassion: "occasion",
  persistant: "persistent", posession: "possession", prefered: "preferred", publically: "publicly", realy: "really", reccomend: "recommend",
  recomend: "recommend", refering: "referring", relevent: "relevant", religous: "religious", resistence: "resistance",
  succesful: "successful", sucessful: "successful", successfull: "successful", supercede: "supersede", suprise: "surprise",
  truely: "truly", unfortunatly: "unfortunately", writting: "writing", becuase: "because", beacuse: "because", buisness: "business",
  bussiness: "business", wensday: "Wednesday", febuary: "February", seige: "siege", tounge: "tongue", twelth: "twelfth",
  vaccum: "vacuum", yeild: "yield", accross: "across", agressive: "aggressive", apparantly: "apparently",
  basicly: "basically", catagory: "category", cemetary: "cemetery", completly: "completely", dilemna: "dilemma", exagerate: "exaggerate",
  excercise: "exercise", familar: "familiar", finaly: "finally", gaurd: "guard", guage: "gauge", harrass: "harass", hieght: "height",
  humourous: "humorous", ignorence: "ignorance", intresting: "interesting", libary: "library",
  mispell: "misspell", nessesary: "necessary", ocurred: "occurred", paralel: "parallel", pasttime: "pastime",
  priviledge: "privilege", pronounciation: "pronunciation", questionaire: "questionnaire", rythm: "rhythm",
  shedule: "schedule", sieze: "seize", sincerly: "sincerely", speach: "speech", strenght: "strength", tendancy: "tendency",
  threshhold: "threshold", tranfer: "transfer", vegatable: "vegetable", visable: "visible", wellcome: "welcome",
  // Apostrophe ke baghair likhe hue sikude lafz
  dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", wasnt: "wasn't", arent: "aren't", werent: "weren't",
  couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't",
  thats: "that's", youre: "you're", theyre: "they're", whats: "what's",
};

const SPELLING = new Map(Object.entries(MISSPELLINGS));

// ---------- a / an ----------
const SILENT_H = /^(hour|honest|honou?r|heir)/;
const YOO_START = /^(univers|unif|unio|uniq|unit|unic|unis|unanim|use|usu|uti|ute|uter|ubiq|ufo|eu|ewe|ura|urin)/;
const WOW_START = /^(one|once)(?![a-z])/;

function needsAn(word: string): boolean | null {
  if (word.length >= 1 && word === word.toUpperCase()) return null; // MBA, HTML jaise: awaaz ka pata nahi
  const lower = word.toLowerCase();
  if (/^[a-z]-/.test(lower)) return null; // x-ray jaise
  if (SILENT_H.test(lower)) return true;
  if (/^hist/.test(lower)) return null; // "a historic" aur "an historic" dono chalte hain
  if (/^[aeiou]/.test(lower)) return !(YOO_START.test(lower) || WOW_START.test(lower));
  return false;
}

// ---------- Mukhtasar nishaan (sentence ka aaghaz) ----------
const ABBREVIATIONS = new Set(["e.g", "i.e", "etc", "vs", "mr", "mrs", "ms", "dr", "prof", "approx", "no", "fig", "cf", "inc", "ltd", "jr", "sr", "st", "al", "co", "dept", "est", "min", "max"]);
const AUXILIARY = new Set(["did", "does", "do", "will", "would", "could", "should", "can", "may", "might", "must", "shall", "if", "whether", "why", "how", "what", "when", "where", "who", "then", "that", "lest"]);

function wordAt(text: string, index: number): string {
  const match = /^[A-Za-z0-9'’-]+/.exec(text.slice(index, index + 40));
  return match ? match[0] : "";
}

// ---------- Niyam ----------
function repeatedWords(text: string, add: Add) {
  for (const match of text.matchAll(/\b([A-Za-z]+)[ \t]+\1\b/gi)) {
    const word = match[1]!.toLowerCase();
    if (word === "had" || word === "that") continue; // "had had", "that that" durust ho sakte hain
    add(match.index, match.index + match[0].length, "grammar", "repeated-word", `The word "${match[1]}" is repeated.`, match[1]!);
  }
}

function spacing(text: string, add: Add) {
  for (const match of text.matchAll(/(\S)( {2,})(?=[^\s,.;:!?])/g)) {
    const start = match.index + 1;
    add(start, start + match[2]!.length, "punctuation", "extra-space", "There is more than one space here.", " ");
  }
  for (const match of text.matchAll(/(\S)( +)([,.;:!?])(?=\s|$)/g)) {
    const start = match.index + 1;
    add(start, start + match[2]!.length, "punctuation", "space-before-punctuation", `Remove the space before "${match[3]}".`, "");
  }
  for (const match of text.matchAll(/\((?=[ \t]+\S)([ \t]+)/g)) {
    const start = match.index + 1;
    add(start, start + match[1]!.length, "punctuation", "space-after-bracket", 'Remove the space after "(".', "");
  }
  for (const match of text.matchAll(/(\S)([ \t]+)\)/g)) {
    const start = match.index + 1;
    add(start, start + match[2]!.length, "punctuation", "space-before-bracket", 'Remove the space before ")".', "");
  }
}

function missingSpaceAfterPunctuation(text: string, add: Add) {
  for (let i = 2; i < text.length - 1; i += 1) {
    const mark = text[i]!;
    if (mark !== "," && mark !== ";" && mark !== "!" && mark !== "?" && mark !== ".") continue;
    const before = text[i - 1]!;
    const before2 = text[i - 2]!;
    const next = text[i + 1]!;
    if (!/[A-Za-z]/.test(before) || !/[A-Za-z]/.test(before2) || !/[A-Za-z]/.test(next)) continue;
    if (mark === "." && !(/[a-z]/.test(before) && /[A-Z]/.test(next) && /[a-z]/.test(text[i + 2] ?? ""))) continue;
    add(i, i + 1, "punctuation", "missing-space", `Add a space after "${mark}".`, `${mark} `);
  }
}

function repeatedPunctuation(text: string, add: Add) {
  for (const match of text.matchAll(/([!?,;])\1+/g)) {
    add(match.index, match.index + match[0].length, "punctuation", "repeated-punctuation", "This punctuation mark is repeated.", match[1]!);
  }
  for (const match of text.matchAll(/\.{4,}/g)) {
    add(match.index, match.index + match[0].length, "punctuation", "long-ellipsis", "Use three dots for an ellipsis.", "...");
  }
}

function lowercaseI(text: string, add: Add) {
  for (const match of text.matchAll(/(^|\s)i(?=$|\s|[,!?;:]|['’](?:m|ll|ve|d)\b)/g)) {
    const at = match.index + match[1]!.length;
    add(at, at + 1, "grammar", "lowercase-i", 'The word "I" should be a capital letter.', "I");
  }
}

function capitals(text: string, add: Add) {
  for (const match of text.matchAll(/([.!?])(\s+)([a-z])/g)) {
    const punctAt = match.index;
    if (text[punctAt - 1] === ".") continue; // ellipsis
   const token = text.slice(Math.max(0, punctAt - 14), punctAt).split(/\s/).pop()!.toLowerCase().replace(/^[("'[]+/, "");
    if (ABBREVIATIONS.has(token) || /^[a-z]$/.test(token) || /^\d+$/.test(token)) continue;
    const at = punctAt + 1 + match[2]!.length;
    if (/[A-Z0-9]/.test(wordAt(text, at).slice(1))) continue; // eBay, iPhone
    if (text[at + 1] === ")" || text[at + 1] === ".") continue; // "a)" jaisi list aur "i.e." jaisa
    add(at, at + 1, "grammar", "sentence-capital", "A sentence should start with a capital letter.", text[at]!.toUpperCase());
  }
  for (const match of text.matchAll(/(^|\n[ \t]*\n)[ \t]*([a-z])/g)) {
    const at = match.index + match[0].length - 1;
    if (/[A-Z0-9]/.test(wordAt(text, at).slice(1))) continue;
    add(at, at + 1, "grammar", "sentence-capital", "A sentence should start with a capital letter.", text[at]!.toUpperCase());
  }
}

function articles(text: string, add: Add) {
  for (const match of text.matchAll(/\b(a|an)[ \t]+([A-Za-z][A-Za-z'’-]*)/gi)) {
    const article = match[1]!;
    const wants = needsAn(match[2]!);
    if (wants === null) continue;
    const isAn = article.toLowerCase() === "an";
    if (isAn === wants) continue;
    if (article === "A" || article === "AN" || article === "An") {
      // Badi "A" sirf jumle ke shuru mein dekhte hain ("Plan A or B" jaise nahi)
      const before = text.slice(0, match.index).trimEnd();
      if (before !== "" && !/[.!?]$/.test(before) && article === "A") continue;
    }
    const fixed = matchCase(article, wants ? "an" : "a");
    add(match.index, match.index + article.length, "grammar", "a-an", wants ? `Use "an" before "${match[2]}".` : `Use "a" before "${match[2]}".`, fixed);
  }
}

interface Phrase {
  re: RegExp;
  to: (m: RegExpExecArray) => string;
  message: (m: RegExpExecArray) => string;
  kind: IssueKind;
  rule: string;
}

const PHRASES: Phrase[] = [
  { re: /\b(could|would|should|must|might)[ \t]+of\b/gi, to: (m) => `${m[1]} have`, message: (m) => `Use "${m[1]} have", not "${m[1]} of".`, kind: "grammar", rule: "modal-of" },
  { re: /\btheir[ \t]+(is|are|was|were)\b/gi, to: (m) => `${matchCase(m[0], "there")} ${m[1]}`, message: () => 'Use "there" here, not "their".', kind: "grammar", rule: "there-their" },
  { re: /\byour[ \t]+(welcome|not|a|an|the)\b/gi, to: (m) => `${matchCase(m[0], "you're")} ${m[1]}`, message: () => 'Use "you\'re" (you are) here.', kind: "grammar", rule: "your-youre" },
  { re: /\bits[ \t]+(a|an|been|not)\b/gi, to: (m) => `${matchCase(m[0], "it's")} ${m[1]}`, message: () => 'Use "it\'s" (it is or it has) here.', kind: "grammar", rule: "its-its" },
  { re: /\b(he|she|it)[ \t]+don['’]t\b/gi, to: (m) => `${m[1]} doesn't`, message: (m) => `Use "doesn't" after "${m[1]}".`, kind: "grammar", rule: "subject-verb" },
  { re: /\b(we|they|you)[ \t]+was\b/gi, to: (m) => `${m[1]} were`, message: (m) => `Use "were" after "${m[1]}".`, kind: "grammar", rule: "subject-verb" },
  { re: /\bI[ \t]+(?:is|are)\b/g, to: () => "I am", message: () => 'Use "I am".', kind: "grammar", rule: "subject-verb" },
  { re: /\bI[ \t]+has\b/g, to: () => "I have", message: () => 'Use "I have".', kind: "grammar", rule: "subject-verb" },
  { re: /\b(more|most)[ \t]+(better|worse|easier|easiest|faster|bigger|smaller|harder|best|worst)\b/gi, to: (m) => matchCase(m[0], m[2]!.toLowerCase()), message: (m) => `"${m[2]}" already means "${m[1]!.toLowerCase()}". Drop "${m[1]}".`, kind: "grammar", rule: "double-comparative" },
  { re: /\b(more|less|better|worse|bigger|smaller|faster|slower|older|younger|higher|lower|larger|greater)[ \t]+then\b/gi, to: (m) => `${m[1]} than`, message: () => 'Use "than" to compare things.', kind: "grammar", rule: "then-than" },
  { re: /\birregardless\b/gi, to: (m) => matchCase(m[0], "regardless"), message: () => 'Use "regardless".', kind: "grammar", rule: "irregardless" },
  { re: /\bsupposably\b/gi, to: (m) => matchCase(m[0], "supposedly"), message: () => 'Use "supposedly".', kind: "spelling", rule: "supposably" },
  { re: /\bfor all intensive purposes\b/gi, to: (m) => matchCase(m[0], "for all intents and purposes"), message: () => 'The phrase is "for all intents and purposes".', kind: "grammar", rule: "intents" },
  { re: /\band etc\b/gi, to: (m) => matchCase(m[0], "etc"), message: () => '"etc" already means "and so on". Drop "and".', kind: "style", rule: "and-etc" },
];

function phrases(text: string, add: Add) {
  for (const phrase of PHRASES) {
    for (const match of text.matchAll(phrase.re)) {
      add(match.index, match.index + match[0].length, phrase.kind, phrase.rule, phrase.message(match), phrase.to(match));
    }
  }
  for (const match of text.matchAll(/\b(he|she|it)[ \t]+have\b/gi)) {
    const prev = /([A-Za-z']+)\s*$/.exec(text.slice(Math.max(0, match.index - 20), match.index));
    if (prev && AUXILIARY.has(prev[1]!.toLowerCase())) continue; // "does it have", "should he have"
    add(match.index, match.index + match[0].length, "grammar", "subject-verb", `Use "has" after "${match[1]}".`, `${match[1]} has`);
  }
}

function misspellings(text: string, add: Add) {
  for (const match of text.matchAll(/\b[A-Za-z]+\b/g)) {
    const word = match[0];
    const fix = SPELLING.get(word.toLowerCase());
    if (fix === undefined) continue;
    const replacement = matchCase(word, fix);
    add(match.index, match.index + word.length, "spelling", "misspelling", `"${word}" is usually written "${replacement}".`, replacement);
  }
}

function brackets(text: string, add: Add) {
  for (const [open, close, name] of [["(", ")", "bracket"], ["[", "]", "square bracket"]] as const) {
    const stack: number[] = [];
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i]!;
      if (char === open) stack.push(i);
      else if (char === close) {
        if (stack.length > 0) {
          stack.pop();
          continue;
        }
        const lineStart = text.lastIndexOf("\n", i - 1) + 1;
        const isMarker = /^\s*[A-Za-z0-9]{1,3}$/.test(text.slice(lineStart, i)); // "1)" jaisi list
        const isFace = i > 0 && ":;=-".includes(text[i - 1]!); // :) jaisa chehra
        if (!isMarker && !isFace) add(i, i + 1, "punctuation", "unmatched-bracket", `This closing ${name} has no opening ${name}.`, null);
      }
    }
    for (const at of stack) {
      const isFace = at + 1 < text.length && ":;=".includes(text[at + 1]!);
      if (!isFace) add(at, at + 1, "punctuation", "unmatched-bracket", `This opening ${name} is never closed.`, null);
    }
  }
  const quotes: number[] = [];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '"') quotes.push(i);
  if (quotes.length % 2 === 1) {
    const at = quotes[quotes.length - 1]!;
    add(at, at + 1, "punctuation", "unmatched-quote", "A quotation mark may be missing its pair.", null);
  }
}

function longSentences(text: string, add: Add) {
  for (const match of text.matchAll(/[^.!?\n]+[.!?]*/g)) {
    const raw = match[0];
    const words = raw.split(/\s+/).filter(Boolean).length;
    if (words <= GRAMMAR_LIMITS.longSentenceWords) continue;
    const lead = raw.length - raw.trimStart().length;
    add(match.index + lead, match.index + raw.trimEnd().length, "style", "long-sentence", `This sentence has ${words} words. Shorter sentences are usually easier to read.`, null);
  }
}

// ---------- Mukhya function ----------
export function checkText(text: string): Issue[] {
  const drafts: Draft[] = [];
  const add: Add = (start, end, kind, rule, message, replacement) => {
    drafts.push({ start, end, kind, rule, message, replacement });
  };
  repeatedWords(text, add);
  spacing(text, add);
  missingSpaceAfterPunctuation(text, add);
  repeatedPunctuation(text, add);
  lowercaseI(text, add);
  capitals(text, add);
  articles(text, add);
  phrases(text, add);
  misspellings(text, add);
  brackets(text, add);
  longSentences(text, add);

  const shielded = protectedRanges(text);
  const kept = drafts.filter((d) => !shielded.some(([from, to]) => d.start < to && d.end > from));
  kept.sort((a, b) => a.start - b.start || b.end - a.end);

  const issues: Issue[] = [];
  let lastEnd = -1;
  for (const draft of kept) {
    if (draft.start < lastEnd) continue; // ek jagah par ek hi mashwara
    issues.push({ ...draft, id: issues.length });
    lastEnd = Math.max(lastEnd, draft.end);
  }
  return issues;
}

export function applyFix(text: string, issue: Issue): string {
  if (issue.replacement === null) return text;
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}

export function applyAllFixes(text: string, issues: Issue[]): { text: string; count: number } {
  const fixable = issues.filter((issue) => issue.replacement !== null).sort((a, b) => b.start - a.start);
  let out = text;
  for (const issue of fixable) out = applyFix(out, issue);
  return { text: out, count: fixable.length };
}

export function countByKind(issues: Issue[]): Record<IssueKind, number> {
  const counts: Record<IssueKind, number> = { spelling: 0, grammar: 0, punctuation: 0, style: 0 };
  for (const issue of issues) counts[issue.kind] += 1;
  return counts;
}

export interface IssueContext {
  before: string;
  match: string;
  after: string;
}

export function contextOf(text: string, issue: Issue, radius = 30): IssueContext {
  const flat = (value: string) => value.replace(/\s+/g, " ");
  const from = Math.max(0, issue.start - radius);
  const to = Math.min(text.length, issue.end + radius);
  return {
    before: (from > 0 ? "…" : "") + flat(text.slice(from, issue.start)),
    match: text.slice(issue.start, issue.end).length > 80 ? `${flat(text.slice(issue.start, issue.start + 80))}…` : flat(text.slice(issue.start, issue.end)),
    after: flat(text.slice(issue.end, to)) + (to < text.length ? "…" : ""),
  };
}