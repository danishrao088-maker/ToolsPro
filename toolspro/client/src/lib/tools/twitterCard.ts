import { plural } from "../format";
import { advisory, checkHttpUrl, cleanText, escapeMarkup, joinNotes } from "./seoCommon";
import type { TransformResult } from "./types";

export type TwitterCardType = "summary" | "summary_large_image";

export const CARD_TYPE_OPTIONS: { value: TwitterCardType; label: string }[] = [
  { value: "summary", label: "Summary (small image)" },
  { value: "summary_large_image", label: "Summary with large image" },
];

export interface TwitterCardInput {
  card: TwitterCardType;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  site: string;
  creator: string;
}

const LIMITS = { title: 200, description: 500, imageAlt: 500 } as const;
const HANDLE_PATTERN = /^@?[A-Za-z0-9_]{1,15}$/;

type HandleResult = { ok: true; handle: string } | { ok: false; error: string };

function normalizeHandle(value: string, label: string): HandleResult {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, handle: "" };
  if (!HANDLE_PATTERN.test(trimmed)) {
    return { ok: false, error: `${label} must be 1 to 15 letters, numbers or underscores, like @example.` };
  }
  return { ok: true, handle: trimmed.startsWith("@") ? trimmed : `@${trimmed}` };
}

export function generateTwitterCard(input: TwitterCardInput): TransformResult {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const imageAlt = cleanText(input.imageAlt);

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
  if (!CARD_TYPE_OPTIONS.some((option) => option.value === input.card)) {
    return { ok: false, error: "Choose a valid card type." };
  }

  const site = normalizeHandle(input.site, "Site handle");
  if (!site.ok) return site;
  const creator = normalizeHandle(input.creator, "Creator handle");
  if (!creator.ok) return creator;

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
    `<meta name="twitter:card" content="${input.card}">`,
    `<meta name="twitter:title" content="${escapeMarkup(title)}">`,
  ];
  if (description) lines.push(`<meta name="twitter:description" content="${escapeMarkup(description)}">`);
  if (image) lines.push(`<meta name="twitter:image" content="${escapeMarkup(image)}">`);
  if (imageAlt) lines.push(`<meta name="twitter:image:alt" content="${escapeMarkup(imageAlt)}">`);
  if (site.handle) lines.push(`<meta name="twitter:site" content="${site.handle}">`);
  if (creator.handle) lines.push(`<meta name="twitter:creator" content="${creator.handle}">`);

  const notes = joinNotes([
    advisory("The title", title.length, 70, "previews"),
    advisory("The description", description.length, 200, "previews"),
  ]);

  return {
    ok: true,
    output: lines.join("\n"),
    message: `${plural(lines.length, "tag")} generated. Paste them inside the head of the page you want to share. ${notes}`.trim(),
  };
}