import { describe, expect, it } from "vitest";
import { generateCitation, segmentsToHtml, type CitationInput, type CitationResult } from "./citation";

const base: CitationInput = {
  style: "apa",
  source: "book",
  authors: "Khan, Ali",
  title: "Learning to code",
  year: "2020",
  month: "",
  day: "",
  container: "",
  publisher: "Tech Press",
  edition: "",
  volume: "",
  issue: "",
  pages: "",
  link: "",
};

const article: CitationInput = {
  ...base,
  source: "article",
  title: "A study of testing",
  year: "2021",
  container: "Journal of Software",
  publisher: "",
  volume: "12",
  issue: "3",
  pages: "45-67",
  link: "10.1234/abc.5",
};

const website: CitationInput = {
  ...base,
  source: "website",
  title: "How to test",
  year: "2024",
  month: "3",
  day: "5",
  container: "Dev Blog",
  publisher: "",
  link: "https://example.com/post",
};

function ok(result: CitationResult) {
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result;
}

function plain(input: CitationInput): string {
  return ok(generateCitation(input)).plain;
}

function failure(input: CitationInput): string {
  const result = generateCitation(input);
  if (result.ok) throw new Error(`Expected an error but got: ${result.plain}`);
  return result.error;
}

const italics = (input: CitationInput) =>
  ok(generateCitation(input))
    .segments.filter((segment) => segment.italic)
    .map((segment) => segment.text);

describe("APA 7", () => {
  it("formats a book", () => {
    expect(plain(base)).toBe("Khan, A. (2020). Learning to code. Tech Press.");
    expect(italics(base)).toEqual(["Learning to code"]);
  });

  it("formats initials, edition, several authors and a link", () => {
    const result = plain({
      ...base,
      authors: "Khan, Ali\nSmith, Mary Ann",
      edition: "2nd ed.",
      link: "https://example.com/book",
    });
    expect(result).toBe("Khan, A., & Smith, M. A. (2020). Learning to code (2nd ed.). Tech Press. https://example.com/book");
  });

  it("puts a comma before the ampersand with three authors and keeps hyphenated initials", () => {
    expect(plain({ ...base, authors: "Khan, Ali\nSmith, Mary\nLee, Jean-Paul" })).toBe(
      "Khan, A., Smith, M., & Lee, J.-P. (2020). Learning to code. Tech Press."
    );
    expect(plain({ ...base, authors: "Tolkien, J. R. R." })).toBe("Tolkien, J. R. R. (2020). Learning to code. Tech Press.");
  });

  it("treats a name without a comma as an organization and says so", () => {
    const result = ok(generateCitation({ ...base, authors: "World Health Organization" }));
    expect(result.plain).toBe("World Health Organization. (2020). Learning to code. Tech Press.");
    expect(result.message).toContain("organizations");
    expect(ok(generateCitation(base)).message).not.toContain("organizations");
  });

  it("moves the title forward when there is no author, and uses n.d. for a missing year", () => {
    expect(plain({ ...base, authors: "", year: "" })).toBe("Learning to code. (n.d.). Tech Press.");
    expect(plain({ ...base, authors: "", edition: "3rd" })).toBe("Learning to code (3rd ed.). (2020). Tech Press.");
  });

  it("does not add a period after a title that ends with a question mark", () => {
    expect(plain({ ...base, title: "Why code?" })).toBe("Khan, A. (2020). Why code? Tech Press.");
  });

  it("formats a journal article with a DOI, en dash and italic volume", () => {
    expect(plain(article)).toBe(
      "Khan, A. (2021). A study of testing. Journal of Software, 12(3), 45–67. https://doi.org/10.1234/abc.5"
    );
    expect(italics(article)).toEqual(["Journal of Software", "12"]);
  });

  it("handles an article without an issue, pages or link", () => {
    expect(plain({ ...article, issue: "", pages: "", link: "" })).toBe(
      "Khan, A. (2021). A study of testing. Journal of Software, 12."
    );
    expect(plain({ ...article, volume: "", issue: "", link: "" })).toBe(
      "Khan, A. (2021). A study of testing. Journal of Software, 45–67."
    );
  });

  it("formats a web page with a full date", () => {
    expect(plain(website)).toBe("Khan, A. (2024, March 5). How to test. Dev Blog. https://example.com/post");
    expect(italics(website)).toEqual(["How to test"]);
  });

  it("handles a month without a day and a page with no year", () => {
    expect(plain({ ...website, day: "" })).toBe("Khan, A. (2024, March). How to test. Dev Blog. https://example.com/post");
    expect(plain({ ...website, year: "", month: "", day: "" })).toBe(
      "Khan, A. (n.d.). How to test. Dev Blog. https://example.com/post"
    );
  });

  it("leaves out the site name when it is also the author", () => {
    expect(plain({ ...website, authors: "Dev Blog" })).toBe("Dev Blog. (2024, March 5). How to test. https://example.com/post");
  });
});

describe("MLA 9", () => {
  const mla = (input: CitationInput): CitationInput => ({ ...input, style: "mla" });

  it("formats a book", () => {
    expect(plain(mla(base))).toBe("Khan, Ali. Learning to code. Tech Press, 2020.");
    expect(italics(mla(base))).toEqual(["Learning to code"]);
  });

  it("writes the second author in normal order and uses et al. for three or more", () => {
    expect(plain(mla({ ...base, authors: "Khan, Ali\nSmith, Mary Ann", edition: "2nd", year: "" }))).toBe(
      "Khan, Ali, and Mary Ann Smith. Learning to code. 2nd ed., Tech Press."
    );
    expect(plain(mla({ ...base, authors: "Khan, Ali\nSmith, Mary\nLee, Jo" }))).toBe(
      "Khan, Ali, et al. Learning to code. Tech Press, 2020."
    );
  });

  it("starts with the title when there is no author", () => {
    expect(plain(mla({ ...base, authors: "" }))).toBe("Learning to code. Tech Press, 2020.");
  });

  it("does not double the period after a publisher that ends with one", () => {
    expect(plain(mla({ ...base, publisher: "Press Inc.", year: "" }))).toBe("Khan, Ali. Learning to code. Press Inc.");
    expect(plain(mla({ ...base, publisher: "Press Inc." }))).toBe("Khan, Ali. Learning to code. Press Inc., 2020.");
  });

  it("formats a journal article", () => {
    expect(plain(mla({ ...article, pages: "45–67" }))).toBe(
      "Khan, Ali. “A study of testing.” Journal of Software, vol. 12, no. 3, 2021, pp. 45-67, https://doi.org/10.1234/abc.5."
    );
    expect(italics(mla(article))).toEqual(["Journal of Software"]);
  });

  it("uses p. for a single page", () => {
    expect(plain(mla({ ...article, pages: "7", link: "" }))).toBe(
      "Khan, Ali. “A study of testing.” Journal of Software, vol. 12, no. 3, 2021, p. 7."
    );
  });

  it("formats a web page with an abbreviated month", () => {
    expect(plain(mla(website))).toBe('Khan, Ali. “How to test.” Dev Blog, 5 Mar. 2024, https://example.com/post.');
    expect(plain(mla({ ...website, month: "6", day: "" }))).toContain("Dev Blog, June 2024,");
    expect(plain(mla({ ...website, month: "9" }))).toContain("Dev Blog, 5 Sept. 2024,");
  });

  it("leaves out the author when it is also the site name", () => {
    expect(plain(mla({ ...website, authors: "Dev Blog" }))).toBe(
      "“How to test.” Dev Blog, 5 Mar. 2024, https://example.com/post."
    );
  });

  it("keeps a question mark inside the quotes without an extra period", () => {
    expect(plain(mla({ ...website, title: "Why test?" }))).toContain("“Why test?” Dev Blog");
  });
});

describe("validation", () => {
  it("requires the right fields for each source", () => {
    expect(failure({ ...base, title: "  " })).toBe("Enter the title.");
    expect(failure({ ...base, publisher: "" })).toBe("Enter the publisher.");
    expect(failure({ ...article, container: "" })).toBe("Enter the journal name.");
    expect(failure({ ...website, link: "" })).toBe("Enter the web address.");
  });

  it("rejects an issue without a volume", () => {
    expect(failure({ ...article, volume: "" })).toContain("volume");
  });

  it("rejects an invalid link", () => {
    expect(failure({ ...website, link: "example.com" })).toContain("Web address");
    expect(failure({ ...article, link: "javascript:alert(1)" })).toContain("DOI or web address");
  });

  it("explains how to write an author", () => {
    expect(failure({ ...base, authors: "Khan," })).toContain("Family name, Given name");
    expect(failure({ ...base, authors: "Khan, Ali, Jr." })).toContain("Family name, Given name");
  });

  it("limits the number of authors", () => {
    const many = Array.from({ length: 21 }, (_, i) => `Family${i}, Given`).join("\n");
    expect(failure({ ...base, authors: many })).toContain("up to 20");
  });

  it("checks the year, month and day", () => {
    expect(failure({ ...base, year: "20" })).toContain("four digits");
    expect(failure({ ...website, year: "" })).toContain("Enter a year");
    expect(failure({ ...website, month: "", day: "5" })).toContain("Choose a month");
    expect(failure({ ...website, month: "2", day: "30" })).toContain("does not exist");
    expect(failure({ ...website, day: "abc" })).toContain("1 to 31");
  });

  it("ignores month and day for books and articles", () => {
    expect(plain({ ...base, month: "13", day: "99" })).toBe("Khan, A. (2020). Learning to code. Tech Press.");
  });

  it("collapses extra spaces and line breaks in the title", () => {
    expect(plain({ ...base, title: "  Learning   to\ncode " })).toBe("Khan, A. (2020). Learning to code. Tech Press.");
  });

  it("rejects text that is too long", () => {
    expect(failure({ ...base, title: "a".repeat(501) })).toContain("too long");
    expect(failure({ ...base, publisher: "a".repeat(201) })).toContain("publisher");
  });
});

describe("segmentsToHtml", () => {
  it("wraps italic text in <i> and escapes special characters", () => {
    const html = ok(generateCitation({ ...base, title: "Q&A <for> \"coders\"" })).html;
    expect(html).toContain("<i>Q&amp;A &lt;for&gt; &quot;coders&quot;</i>");
    expect(segmentsToHtml([{ text: "a", italic: false }, { text: "b", italic: true }])).toBe("a<i>b</i>");
  });
});