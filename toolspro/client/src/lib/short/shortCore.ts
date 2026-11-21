// URL Shortener ke chhote madadgar

// Server sirf "/s/abcd234" deta hai; poora link is website ke apne naam se banta hai
export function shortLinkUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export const MAX_ADDRESS_LENGTH = 2048;