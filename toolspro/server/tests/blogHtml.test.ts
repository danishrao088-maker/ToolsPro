import { describe, expect, it } from "vitest";
import { sanitizeContent } from "../src/services/blogHtml";

describe("sanitizeContent: keeps normal writing", () => {
  it("keeps headings, paragraphs and formatting", () => {
    const html = sanitizeContent("<h2>Title</h2><p>Some <strong>bold</strong>, <em>italic</em> and <u>underlined</u> text.</p>");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underlined</u>");
  });
  it("keeps lists, quotes, code and tables", () => {
    const html = sanitizeContent("<ul><li>one</li></ul><ol><li>two</li></ol><blockquote>q</blockquote><pre><code>x = 1</code></pre><table><tbody><tr><td>c</td></tr></tbody></table>");
    for (const piece of ["<ul><li>one</li></ul>", "<ol><li>two</li></ol>", "<blockquote>q</blockquote>", "<code>x = 1</code>", "<td>c</td>"]) expect(html).toContain(piece);
  });
  it("turns h1 into h2 and h5/h6 into h4", () => {
    const html = sanitizeContent("<h1>A</h1><h5>B</h5><h6>C</h6>");
    expect(html).toContain("<h2>A</h2>");
    expect(html).toContain("<h4>B</h4>");
    expect(html).toContain("<h4>C</h4>");
    expect(html).not.toContain("<h1");
  });
  it("keeps a safe link and adds rel", () => {
    const html = sanitizeContent('<a href="https://example.com/page" title="T">link</a>');
    expect(html).toContain('href="https://example.com/page"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(">link</a>");
  });
  it("keeps target=_blank only, and always sets rel", () => {
    expect(sanitizeContent('<a href="https://example.com" target="_blank">x</a>')).toContain('target="_blank"');
    const other = sanitizeContent('<a href="https://example.com" target="_top" rel="opener">x</a>');
    expect(other).not.toContain("_top");
    expect(other).not.toContain('rel="opener"');
    expect(other).toContain('rel="noopener noreferrer"');
  });
  it("keeps mail and phone links", () => {
    expect(sanitizeContent('<a href="mailto:a@example.com">m</a>')).toContain('href="mailto:a@example.com"');
    expect(sanitizeContent('<a href="tel:+920000000">t</a>')).toContain('href="tel:+920000000"');
  });
  it("keeps an https image, with alt, and makes it lazy", () => {
    const html = sanitizeContent('<img src="https://res.cloudinary.com/x/a.jpg" alt="A picture">');
    expect(html).toContain('src="https://res.cloudinary.com/x/a.jpg"');
    expect(html).toContain('alt="A picture"');
    expect(html).toContain('loading="lazy"');
  });
  it("leaves ordinary text alone", () => {
    expect(sanitizeContent("<p>Tom &amp; Jerry</p>")).toBe("<p>Tom &amp; Jerry</p>");
  });
});

describe("sanitizeContent: removes dangerous content", () => {
  it("removes script tags and their content", () => {
    for (const payload of ["<script>alert(1)</script>", "<ScRiPt>alert(1)</ScRiPt>", "<script src=https://evil.example/x.js></script>", "<scr<script>ipt>alert(1)</scr</script>ipt>"]) {
      const html = sanitizeContent(`<p>ok</p>${payload}`);
      expect(html.toLowerCase()).not.toContain("<script");
      expect(html).not.toContain("alert(1)</");
      expect(html).toContain("<p>ok</p>");
    }
  });
  it("removes event handler attributes", () => {
    for (const payload of ['<img src="https://example.com/a.jpg" onerror="alert(1)">', '<p onclick="alert(1)">x</p>', '<a href="https://example.com" onmouseover="alert(1)">x</a>', "<img src=x onerror=alert(1)>"]) {
      expect(sanitizeContent(payload).toLowerCase()).not.toMatch(/\son\w+=/);
    }
  });
  it("removes javascript: and data: addresses", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "  javascript:alert(1)", "java\tscript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x"]) {
      const html = sanitizeContent(`<a href="${href}">x</a>`);
      expect(html.toLowerCase()).not.toContain("javascript:");
      expect(html.toLowerCase()).not.toContain("data:");
      expect(html.toLowerCase()).not.toContain("vbscript:");
    }
    expect(sanitizeContent('<img src="javascript:alert(1)">').toLowerCase()).not.toContain("javascript:");
    expect(sanitizeContent('<img src="data:image/svg+xml;base64,PHN2Zz4=">').toLowerCase()).not.toContain("data:");
  });
  it("removes protocol-relative image and link addresses", () => {
    expect(sanitizeContent('<img src="//evil.example/a.jpg">')).not.toContain("evil.example");
    expect(sanitizeContent('<a href="//evil.example">x</a>')).not.toContain("evil.example");
  });
  it("removes iframes, objects, embeds, forms, svg, math and style", () => {
    for (const payload of [
      '<iframe src="https://evil.example"></iframe>',
      '<object data="https://evil.example/x.swf"></object>',
      '<embed src="https://evil.example/x.swf">',
      '<form action="https://evil.example"><input name="a"><button>go</button></form>',
      "<svg onload=alert(1)><circle></circle></svg>",
      "<math><mi xlink:href=javascript:alert(1)>x</mi></math>",
      "<style>body{display:none}</style>",
      '<link rel="stylesheet" href="https://evil.example/x.css">',
      '<meta http-equiv="refresh" content="0;url=https://evil.example">',
      '<base href="https://evil.example/">',
    ]) {
      const html = sanitizeContent(`<p>ok</p>${payload}`).toLowerCase();
      for (const tag of ["<iframe", "<object", "<embed", "<form", "<input", "<button", "<svg", "<math", "<style", "<link", "<meta", "<base"]) {
        expect(html).not.toContain(tag);
      }
      expect(html).not.toContain("evil.example");
    }
  });
  it("removes style and class attributes", () => {
    const html = sanitizeContent('<p style="position:fixed;top:0" class="x" id="y" data-a="1">x</p>');
    expect(html).toBe("<p>x</p>");
  });
  it("escapes angle brackets that are text, instead of letting them become tags", () => {
    const html = sanitizeContent("<p>a &lt;script&gt;alert(1)&lt;/script&gt; b</p>");
    expect(html).not.toContain("<script");
  });
  it("copes with broken HTML", () => {
    for (const payload of ["<p>unclosed <strong>bold", "<<p>>x", "<a href='https://example.com'>x", "</p></div>text", ""]) {
      expect(() => sanitizeContent(payload)).not.toThrow();
    }
    expect(sanitizeContent("")).toBe("");
  });
});
describe("sanitizeContent: video embeds", () => {
  it("keeps a YouTube or Vimeo embed", () => {
    const youtube = sanitizeContent('<p>x</p><iframe src="https://www.youtube.com/embed/abc123" width="560" height="315" allowfullscreen></iframe>');
    expect(youtube).toContain('<iframe src="https://www.youtube.com/embed/abc123"');
    expect(sanitizeContent('<iframe src="https://player.vimeo.com/video/123"></iframe>')).toContain("player.vimeo.com");
  });
  it("still removes iframes from any other site, without leaving an empty iframe", () => {
    for (const src of ["https://evil.example/x", "https://www.youtube.com.evil.example/x", "//www.youtube.com/embed/a", "/relative"]) {
      expect(sanitizeContent(`<iframe src="${src}"></iframe>`).toLowerCase(), src).not.toContain("<iframe");
    }
  });
  it("removes event handlers and extra attributes from an embed", () => {
    const html = sanitizeContent('<iframe src="https://www.youtube.com/embed/a" onload="alert(1)" style="x" srcdoc="<b>"></iframe>');
    expect(html).not.toContain("onload");
    expect(html).not.toContain("srcdoc");
    expect(html).not.toContain("style");
  });
});
