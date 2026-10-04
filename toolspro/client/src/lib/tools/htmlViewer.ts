export const MAX_HTML_LENGTH = 200_000;

export interface PreviewOptions {
  allowScripts: boolean;
  allowExternal: boolean;
}

export type PreviewResult =
  | { ok: true; document: string; message: string }
  | { ok: false; error: string };

// CSP: browser ko batati hai ke is page ko kya kya load karne ki ijazat hai.
// Default mein sab band (`default-src 'none'`), sirf wahi kholte hain jo user ne mangi.
export function buildPolicy({ allowScripts, allowExternal }: PreviewOptions): string {
  const web = allowExternal ? " https:" : "";
  const directives = [
    "default-src 'none'",
    `style-src 'unsafe-inline'${web}`,
    `img-src data:${web}`,
    `font-src data:${web}`,
    `media-src data:${web}`,
    "form-action 'none'",
    "base-uri 'none'",
  ];
  if (allowScripts) directives.push(`script-src 'unsafe-inline'${web}`);
  return directives.join("; ");
}

export function buildPreview(html: string, options: PreviewOptions): PreviewResult {
  if (html.trim() === "") return { ok: false, error: "Enter some HTML to preview." };
  if (html.length > MAX_HTML_LENGTH) {
    return {
      ok: false,
      error: `The HTML is too long. The maximum is ${MAX_HTML_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  // Policy sab se pehle (head mein), user ka code uske baad body mein.
  // Hamara doctype pehle aata hai, is liye page "quirks mode" mein nahi jata.
  const document =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${buildPolicy(options)}">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `</head><body>${html}</body></html>`;

  const scripts = options.allowScripts
    ? "Scripts are on. They run in a sandbox that cannot reach this page."
    : "Scripts are off.";
  const external = options.allowExternal
    ? "Images, styles and fonts from https addresses can load."
    : "Nothing is loaded from other websites.";

  return { ok: true, document, message: `Preview updated. ${scripts} ${external}` };
}