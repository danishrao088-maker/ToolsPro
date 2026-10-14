import { describe, expect, it } from "vitest";
import { GRAMMAR_LIMITS, applyAllFixes, applyFix, checkText, contextOf, countByKind } from "./grammar";

const rules = (text: string) => checkText(text).map((issue) => issue.rule);
const fixed = (text: string) => applyAllFixes(text, checkText(text)).text;

describe("repeated words", () => {
  it("finds a repeated word and offers to drop one", () => {
    const [issue] = checkText("This is the the best.");
    expect(issue).toMatchObject({ rule: "repeated-word", replacement: "the", start: 8, end: 15 });
  });
  it("ignores repeats that can be right", () => {
    expect(rules("He said that that was fine. She had had enough.")).toEqual([]);
  });
  it("does not join words across lines", () => {
    expect(rules("The end\nend of it.")).toEqual([]);
  });
});

describe("spacing and punctuation", () => {
  it("finds extra spaces but not indentation", () => {
    expect(fixed("Hello  world.")).toBe("Hello world.");
    expect(rules("  Indented line.\n    Another one.")).toEqual([]);
  });
  it("removes a space before punctuation", () => {
    expect(fixed("Hello , world !")).toBe("Hello, world!");
  });
  it("leaves an ellipsis alone", () => {
    expect(rules("Wait ... what?")).toEqual([]);
  });
  it("adds a missing space after punctuation", () => {
    expect(fixed("Hello,world.This is it")).toBe("Hello, world. This is it");
  });
  it("does not touch decimals, versions, initials or file names", () => {
    expect(rules("It costs 3.50 now. Version 2.1 is out. See node.js and e.g. this.")).toEqual([]);
  });
  it("shortens repeated punctuation", () => {
    expect(fixed("Really?? Yes!!!")).toBe("Really? Yes!");
    expect(fixed("Wait.....")).toBe("Wait...");
  });
  it("fixes spaces inside brackets", () => {
    expect(fixed("It works ( mostly ) fine.")).toBe("It works (mostly) fine.");
  });
});

describe("capital letters", () => {
  it("fixes a lowercase I and its contractions", () => {
    expect(fixed("Today i think i'm right and i'll win.")).toBe("Today I think I'm right and I'll win.");
  });
  it("does not change list marks such as (i)", () => {
    expect(rules("See point (i) and (ii) below.\ni) first\nii) second")).toEqual([]);
  });
  it("capitalises the first letter of sentences", () => {
    expect(fixed("hello there. how are you? fine!")).toBe("Hello there. How are you? Fine!");
  });
  it("capitalises after a blank line", () => {
    expect(fixed("First part.\n\nsecond part.")).toBe("First part.\n\nSecond part.");
  });
  it("skips abbreviations, list numbers and brand names", () => {
    expect(rules("Use fruit, e.g. apples, vs. pears. Mr. Smith came.")).toEqual([]);
    expect(rules("He came. then he left.")).toEqual(["sentence-capital"]);
    expect(rules("Steps:\n1. wash\n2. dry")).toEqual([]);
    expect(rules("Buy it on eBay. iPhone sales are up.")).toEqual([]);
  });
});

describe("a and an", () => {
  it("fixes a before a vowel sound and an before a consonant sound", () => {
    expect(fixed("She has a apple and an book.")).toBe("She has an apple and a book.");
  });
  it("knows common exceptions", () => {
    expect(rules("We saw a university, a user, a one-time offer, a European trip, an hour, an honest man, an umbrella, an unimportant detail")).toEqual([]);
    expect(rules("It was an onerous task.")).toEqual([]);
  });
  it("flags words the other way round", () => {
    expect(fixed("See an university and a hour and a umbrella.")).toBe("See a university and an hour and an umbrella.");
  });
  it("keeps capital letters", () => {
    expect(fixed("A apple a day.")).toBe("An apple a day.");
  });
  it("skips acronyms and labels like Plan A or B", () => {
    expect(rules("It is an HTML page and a MBA course. Plan A or B.")).toEqual([]);
  });
});

describe("common mistakes", () => {
  it("fixes could of and similar", () => {
    expect(fixed("You should of known. It might of rained.")).toBe("You should have known. It might have rained.");
  });
  it("fixes there, your and its", () => {
    expect(fixed("Their is a cat. Your welcome. Its a dog.")).toBe("There is a cat. You're welcome. It's a dog.");
  });
  it("leaves correct uses alone", () => {
    expect(rules("Their house is big. Your car is here. Its tail is long. They're here.")).toEqual([]);
  });
  it("fixes subject and verb pairs", () => {
    expect(fixed("He don't know. They was late. I is ready. I has it.")).toBe("He doesn't know. They were late. I am ready. I have it.");
  });
  it("handles he have only when it is a mistake", () => {
    expect(fixed("She have a car.")).toBe("She has a car.");
    expect(rules("Does she have a car? Should he have left?")).toEqual([]);
  });
  it("fixes double comparatives and then/than", () => {
    expect(fixed("This is more better. It is bigger then that.")).toBe("This is better. It is bigger than that.");
  });
  it("fixes a few set phrases", () => {
    expect(fixed("Irregardless, for all intensive purposes it works, and etc.")).toBe("Regardless, for all intents and purposes it works, etc.");
  });
});

describe("spelling", () => {
  it("fixes common misspellings and keeps the case", () => {
    expect(fixed("I recieve Teh mail. DEFINATELY seperate.")).toBe("I receive The mail. DEFINITELY separate.");
    expect(fixed("Alot of people.")).toBe("A lot of people.");
  });
  it("fixes missing apostrophes", () => {
    expect(fixed("I dont know. Thats fine. Dont go.")).toBe("I don't know. That's fine. Don't go.");
  });
  it("does not touch words that only contain a mistake or contractions", () => {
    expect(rules("My_dont_var and don't and can't.")).toEqual([]);
  });
});

describe("brackets and quotes", () => {
  it("finds brackets without a pair", () => {
    expect(rules("Here (is a note.")).toEqual(["unmatched-bracket"]);
    expect(rules("Here is a note) too.")).toEqual(["unmatched-bracket"]);
    expect(checkText("Here (is a note.")[0]!.replacement).toBeNull();
  });
  it("ignores smiley faces and list marks", () => {
    expect(rules("Nice :) and sad :(\n1) first\na) second")).toEqual([]);
  });
  it("finds an odd quotation mark", () => {
    expect(rules('She said "hello and left.')).toEqual(["unmatched-quote"]);
    expect(rules('She said "hello" and left.')).toEqual([]);
  });
});

describe("style", () => {
  it("flags very long sentences without a fix", () => {
    const long = `${Array.from({ length: 45 }, (_, i) => `word${i}`).join(" ")}.`;
    const [issue] = checkText(long);
    expect(issue).toMatchObject({ rule: "long-sentence", replacement: null, kind: "style" });
    expect(issue!.message).toContain("45 words");
  });
  it("does not flag normal sentences", () => {
    expect(rules("This is a short sentence. So is this one.")).toEqual([]);
  });
});

describe("web addresses and emails", () => {
  it("never changes them", () => {
    expect(rules("Visit https://example.com/a,b?x=1&y=2 or www.site.com/dont. Mail me@example.com, teh.")).toEqual(["misspelling"]);
  });
});

describe("applying fixes", () => {
  it("applies one fix and keeps the rest", () => {
    const text = "I recieve teh mail.";
    const issues = checkText(text);
    expect(issues).toHaveLength(2);
    expect(applyFix(text, issues[0]!)).toBe("I receive teh mail.");
  });
  it("does nothing for issues without a fix", () => {
    const text = "Here (is a note.";
    expect(applyFix(text, checkText(text)[0]!)).toBe(text);
    expect(applyAllFixes(text, checkText(text))).toEqual({ text, count: 0 });
  });
  it("applies all fixes at once", () => {
    const result = applyAllFixes("i  recieve teh mail ,ok", checkText("i  recieve teh mail ,ok"));
    expect(result.count).toBeGreaterThan(3);
    expect(checkText(result.text).filter((i) => i.replacement !== null)).toEqual([]);
  });
  it("never reports overlapping issues", () => {
    const issues = checkText("i dont think teh the answer , is ok??");
    for (let i = 1; i < issues.length; i += 1) expect(issues[i]!.start).toBeGreaterThanOrEqual(issues[i - 1]!.end);
  });
  it("counts issues by kind", () => {
    expect(countByKind(checkText("i recieve teh mail  ."))).toEqual({ spelling: 2, grammar: 1, punctuation: 1, style: 0 });
  });
  it("gives a short readable context", () => {
    const text = "Some words before and then teh mistake and some words after it all.";
    const issue = checkText(text)[0]!;
    expect(contextOf(text, issue)).toEqual({ before: "Some words before and then ", match: "teh", after: " mistake and some words after …" });
  });
});

describe("speed and odd input", () => {
  it("handles empty and symbol-only text", () => {
    expect(checkText("")).toEqual([]);
    expect(checkText("!!! ??? ... ,,,")).toBeDefined();
  });
  it("copes with the largest allowed text and nasty patterns", () => {
    const started = Date.now();
    checkText("a".repeat(GRAMMAR_LIMITS.chars));
    checkText(" ".repeat(GRAMMAR_LIMITS.chars));
    checkText("a ".repeat(GRAMMAR_LIMITS.chars / 2));
    checkText("the the ".repeat(GRAMMAR_LIMITS.chars / 8));
    checkText("(".repeat(GRAMMAR_LIMITS.chars));
    checkText("a.A ".repeat(GRAMMAR_LIMITS.chars / 4));
    checkText("Word, ".repeat(GRAMMAR_LIMITS.chars / 6));
    expect(Date.now() - started).toBeLessThan(8000);
  });
});