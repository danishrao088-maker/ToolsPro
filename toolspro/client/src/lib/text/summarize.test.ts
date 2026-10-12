import { describe, expect, it } from "vitest";
import { SUMMARY_LIMITS, countWords, formatSummary, splitSentences, summarize } from "./summarize";

describe("splitSentences", () => {
  it("splits on full stops, question marks and exclamation marks", () => {
    expect(splitSentences("One is here. Is two here? Three is here!")).toEqual(["One is here.", "Is two here?", "Three is here!"]);
  });
  it("does not split after titles, initials or inside numbers", () => {
    expect(splitSentences("Dr. Khan paid 3.5 million. He said e.g. nothing.")).toEqual(["Dr. Khan paid 3.5 million.", "He said e.g. nothing."]);
  });
  it("splits on line breaks and Urdu full stops", () => {
    expect(splitSentences("First line\nSecond line")).toEqual(["First line", "Second line"]);
    expect(splitSentences("یہ پہلا جملہ ہے۔ یہ دوسرا جملہ ہے۔")).toHaveLength(2);
  });
  it("keeps a closing quote with its sentence", () => {
    expect(splitSentences('He said "go home." Then he left.')).toEqual(['He said "go home."', "Then he left."]);
  });
  it("drops pieces that have no letters or numbers", () => {
    expect(splitSentences("Hello there.\n\n---\n\nBye now.")).toEqual(["Hello there.", "Bye now."]);
  });
});

const article = [
  "Solar power is growing quickly across the world.",
  "My cat sleeps all day on the sofa.",
  "Solar panels turn sunlight into electricity for homes and factories.",
  "The price of solar panels has fallen sharply in ten years.",
  "Yesterday I bought some bread from the corner shop.",
  "Many countries now build large solar farms to produce clean power.",
].join(" ");

describe("summarize", () => {
  it("keeps the sentences about the main topic, in the original order", () => {
    const out = summarize(article, 3);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.sentences).toHaveLength(3);
    expect(out.result.sentences.join(" ")).not.toContain("cat");
    expect(out.result.sentences.join(" ")).not.toContain("bread");
    const positions = out.result.sentences.map((s) => article.indexOf(s));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(out.result.alreadyShort).toBe(false);
    expect(out.result.totalSentences).toBe(6);
    expect(out.result.summaryWords).toBeLessThan(out.result.originalWords);
  });
  it("gives the same answer every time", () => {
    expect(summarize(article, 2)).toEqual(summarize(article, 2));
  });
  it("returns the whole text when it is already short", () => {
    const out = summarize("Only one sentence here.", 3);
    expect(out.ok && out.result.alreadyShort).toBe(true);
    expect(out.ok && out.result.sentences).toEqual(["Only one sentence here."]);
  });
  it("checks the input", () => {
    expect(summarize("   ", 3)).toMatchObject({ ok: false });
    expect(summarize(article, 0)).toMatchObject({ ok: false });
    expect(summarize(article, 11)).toMatchObject({ ok: false });
    expect(summarize(article, 2.5)).toMatchObject({ ok: true });
    expect(summarize("a. ".repeat(SUMMARY_LIMITS.chars), 3)).toMatchObject({ ok: false });
    expect(summarize("!!! ... ???", 3)).toMatchObject({ ok: false });
  });
  it("never returns a sentence that is not in the text", () => {
    const out = summarize(article, 4);
    if (out.ok) for (const sentence of out.result.sentences) expect(article).toContain(sentence);
  });
  it("handles a long text quickly", () => {
    const long = article.repeat(2000);
    const started = Date.now();
    const out = summarize(long.slice(0, SUMMARY_LIMITS.chars), 5);
    expect(out.ok).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe("helpers", () => {
  it("counts words", () => {
    expect(countWords("It's a well-known fact, 3 times.")).toBe(6);
    expect(countWords("")).toBe(0);
  });
  it("formats paragraph and bullets", () => {
    expect(formatSummary(["A one.", "B two."], "paragraph")).toBe("A one. B two.");
    expect(formatSummary(["A one.", "B two."], "bullets")).toBe("• A one.\n• B two.");
  });
});

describe("splitSentences edge cases", () => {
  it("does not split inside web addresses or file names", () => {
    expect(splitSentences("Visit example.com now. Open file.txt too.")).toEqual(["Visit example.com now.", "Open file.txt too."]);
  });
  it("keeps text that has no ending mark", () => {
    expect(splitSentences("No ending mark here")).toEqual(["No ending mark here"]);
    expect(splitSentences("Done. And then the rest")).toEqual(["Done.", "And then the rest"]);
  });
  it("treats repeated marks as one end", () => {
    expect(splitSentences("Really?! Yes... fine.")).toEqual(["Really?!", "Yes...", "fine."]);
  });
});