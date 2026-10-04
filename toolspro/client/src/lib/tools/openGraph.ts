import { plural } from "../format";
import { checkHttpUrl, cleanText, escapeMarkup, joinNotes } from "./seoCommon";
import type { TransformResult } from "./types";

export type OgType = "website" | "article";

export const OG_TYPE_OPTIONS: { value: OgType; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "article", label: "Article" },
];

export interface OpenGraphInput {
  title: string;
  description: string;
  type: OgType;
  url: string;
  imageUrl: string;
  imageAlt: string;
  siteName: string;
}

const LIMITS = { title: 200, description: 500, imageAlt: 500, siteName: 100 } as const;

export function generateOpenGraph(input: OpenGraphInput): TransformResult {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const imageAlt = cleanText(input.imageAlt);
  const siteName = cleanText(input.siteName);

  if (title === "") return { ok: false, error: "Enter a title." };
  if (title.length > LIMITS.title) {
    return { ok: false, error: `The title is too long. The maximum is ${LIMITS.title} characters.` };
  }
  if (description.length > LIMITS.description) {
    return { ok: false, error: `The description is too long. The maximum is ${LIMITS.description} characters.` };
  }
  if (imageAlt.length > LIMITS.imageAlt) {
    return { ok: false, error: `The image description is too long. The maximum is ${LIMITS.imageAlt} characters.` };
  }
  if (siteName.length > LIMITS.siteName) {
    return { ok: false, error: `The site name is too long. The maximum is ${LIMITS.siteName} characters.` };
  }
  if (!OG_TYPE_OPTIONS.some((option) => option.value === input.type)) {
    return { ok: false, error: "Choose a valid content type." };
  }

  const page = checkHttpUrl(input.url, "Page URL");
  if (!page.ok) return page;

  let image = "";
  if (input.imageUrl.trim() !== "") {
    const checked = checkHttpUrl(input.imageUrl, "Image URL");
    if (!checked.ok) return checked;
    image = checked.href;
  }
  if (imageAlt !== "" && image === "") {
    return { ok: false, error: "Add an image address, or clear the image description." };
  }

  const lines: string[] = [
    `<meta property="og:title" content="${escapeMarkup(title)}">`,
    `<meta property="og:type" content="${input.type}">`,
    `<meta property="og:url" content="${escapeMarkup(page.href)}">`,
  ];
  if (description) lines.push(`<meta property="og:description" content="${escapeMarkup(description)}">`);
  if (image) lines.push(`<meta property="og:image" content="${escapeMarkup(image)}">`);
  if (imageAlt) lines.push(`<meta property="og:image:alt" content="${escapeMarkup(imageAlt)}">`);
  if (siteName) lines.push(`<meta property="og:site_name" content="${escapeMarkup(siteName)}">`);

  const notes = joinNotes([image === "" ? "No image was added, so shared links may look plain." : null]);

  return {
    ok: true,
    output: lines.join("\n"),
    message: `${plural(lines.length, "tag")} generated. Paste them inside the head of the page you want to share. ${notes}`.trim(),
  };
}