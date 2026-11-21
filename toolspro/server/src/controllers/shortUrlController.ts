import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

export interface ShortUrlApi {
  create(input: string, ownHosts: string[]): Promise<unknown>;
  resolve(code: unknown): Promise<string | null>;
}

const NOT_FOUND_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex"><title>Link not found</title></head>' +
  '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem">' +
  "<h1>Link not found</h1><p>This short link does not exist or has expired.</p></body></html>";

export function createShortUrlHandlers(service: ShortUrlApi) {
  // POST /api/short  { "url": "https://..." }
  const createShortLink = asyncHandler(async (req, res) => {
    const url = (req.body as { url?: unknown } | null | undefined)?.url;
    if (typeof url !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Enter the web address you want to shorten, for example https://example.com/a-long-page.");
    }
    // Is website ka apna naam (req.hostname): apne hi link ko dobara chhota karna roka jata hai
    const data = await service.create(url, [req.hostname]);
    res.status(201).json({ success: true, data });
  });

  // GET /s/:code  ->  asal address par 302
  const followShortLink = asyncHandler(async (req, res) => {
    const destination = await service.resolve(req.params.code);
    // Cache nahi (warna click ginti aur expiry ghalat ho jayein) aur search engine index na kare
    res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    if (!destination || !/^https?:\/\//i.test(destination)) {
      res.status(404).type("html").send(NOT_FOUND_HTML);
      return;
    }
    res.redirect(302, destination);
  });

  return { createShortLink, followShortLink };
}