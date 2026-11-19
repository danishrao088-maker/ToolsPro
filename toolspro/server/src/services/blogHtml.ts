import sanitizeHtml from "sanitize-html";

// Editor ka HTML sirf wahi cheezein rakhta hai jo humne ijazat di hain. Script, event (onclick...), style, iframe,
// javascript:/data: links sab hata diye jate hain. Ye wahi HTML hai jo public page par dikhaya jata hai.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
    "ul", "ol", "li", "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    h1: "h2", // post ka title hi h1 hota hai
    h5: "h4",
    h6: "h4",
    a: (_tagName, attribs) => {
      const attrs: Record<string, string> = { rel: "noopener noreferrer" };
      if (attribs.href) attrs.href = attribs.href;
      if (attribs.title) attrs.title = attribs.title;
      if (attribs.target === "_blank") attrs.target = "_blank";
      return { tagName: "a", attribs: attrs };
    },
    img: (_tagName, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
  },
};

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}