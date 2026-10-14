import type { ParsedHtml } from "./htmlParse";
import type { RawScan } from "./htmlScan";
import type { PageInfo, SeoScore } from "./webAnalysis";

// "Page Speed Test": ye asli browser test (jaise Lighthouse) nahi, balkay HTML aur ek extra request par mabni jaldi jaanch hai.

const NOTE =
  "This is a quick check based on the page's HTML and one extra request from our server. It does not open the page like a browser, so it does not measure what real visitors feel (such as Core Web Vitals), and it does not download your images, scripts or styles. Use it to spot common problems, not to get an exact speed.";

export interface Compression {
  checked: boolean;
  encoding: string | null; // gzip, br ... ya null agar sikoda nahi
}

const COMPRESSED = new Set(["gzip", "br", "deflate", "zstd"]);

const hostOf = (value: string, base: string): string | null => {
  if (value === "" || /^(data|blob|javascript|about):/i.test(value)) return null;
  try {
    const url = new URL(value, base);
    return /^https?:$/.test(url.protocol) ? url.hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
};

export function checkSpeed(parsed: ParsedHtml, scan: RawScan, page: PageInfo, compression: Compression): SeoScore {
  void parsed;
  const checks: SeoScore["checks"] = [];
  const add = (id: string, label: string, max: number, points: number, message: string) => {
    checks.push({ id, label, max, points, status: points >= max ? "pass" : points > 0 ? "warn" : "fail", message });
  };

  const ms = page.timeMs;
  add("response", "HTML load time", 20, ms < 800 ? 20 : ms < 1800 ? 12 : ms < 3000 ? 6 : 0, `The page HTML loaded in ${ms} ms, measured from our server.${ms < 800 ? "" : " Under 800 ms is a good aim."}`);

  const kb = Math.round(page.bodyBytes / 1024);
  if (page.truncated) add("html-size", "HTML size", 10, 0, "The HTML is larger than 1 MB, so only the first part was read. A very large page is slow to download and process.");
  else add("html-size", "HTML size", 10, page.bodyBytes < 100 * 1024 ? 10 : page.bodyBytes < 300 * 1024 ? 6 : 3, `The HTML is about ${kb} KB.${page.bodyBytes < 100 * 1024 ? "" : " Under 100 KB is a good aim."}`);

  const encoding = compression.encoding?.toLowerCase() ?? null;
  if (!compression.checked) add("compression", "Text compression", 10, 5, "We could not check whether the server compresses the page.");
  else if (encoding !== null && COMPRESSED.has(encoding)) add("compression", "Text compression", 10, 10, `The server compresses the page (${encoding}).`);
  else if (page.bodyBytes < 1400) add("compression", "Text compression", 10, 10, "The page is too small for compression to matter.");
  else add("compression", "Text compression", 10, 0, "The server did not compress the page. Turning on gzip or Brotli usually makes text files much smaller.");

  const blocking = scan.scripts.filter((s) => s.src !== null && s.src !== "" && s.inHead && !s.async && !s.defer && !s.module).length;
  add("blocking", "Scripts that block the page", 15, blocking === 0 ? 15 : blocking <= 2 ? 8 : 0, blocking === 0 ? "No scripts in the head block the page from showing." : `${blocking} script${blocking === 1 ? "" : "s"} in the head load without async or defer. The page waits for them before it can show.`);

  const resources = scan.scripts.filter((s) => s.src).length + scan.stylesheets.length + scan.images.filter((i) => i.src !== "" && !i.src.startsWith("data:")).length;
  add("requests", "Number of files", 10, resources <= 25 ? 10 : resources <= 60 ? 5 : 0, `The page asks for about ${resources} files (scripts, styles and images).${resources <= 25 ? "" : " Fewer files usually load faster."}`);

  const total = scan.images.length;
  const sized = scan.images.filter((i) => i.width !== null && i.height !== null).length;
  if (total === 0) add("dimensions", "Image width and height", 10, 10, "No images found.");
  else add("dimensions", "Image width and height", 10, sized === total ? 10 : sized / total >= 0.8 ? 5 : 0, sized === total ? `All ${total} images have a width and height, so the page does not jump while loading.` : `${total - sized} of ${total} images have no width and height. The page can jump around while they load.`);

  if (total <= 3) add("lazy", "Lazy loading of images", 5, 5, "The page has few images, so lazy loading is not needed.");
  else {
    const lazy = scan.images.slice(3).filter((i) => i.loading === "lazy").length;
    const later = total - 3;
    add("lazy", "Lazy loading of images", 5, lazy / later >= 0.5 ? 5 : lazy > 0 ? 2 : 0, lazy === 0 ? "No images use loading=\"lazy\". Images far down the page can load later." : `${lazy} of ${later} later images use lazy loading.`);
  }

  const headers = page.headers;
  const cached = Boolean(headers["cache-control"] || headers["etag"] || headers["last-modified"] || headers["expires"]);
  add("caching", "Caching headers", 5, cached ? 5 : 0, cached ? "The server sends caching headers for the page." : "The server sends no caching headers for the page.");

  add("redirects", "Redirects", 5, page.redirects === 0 ? 5 : page.redirects === 1 ? 3 : 0, page.redirects === 0 ? "The address opens the page directly." : `The address redirects ${page.redirects} time${page.redirects === 1 ? "" : "s"} before the page. Each redirect adds waiting time.`);

  const own = hostOf(page.url, page.url);
  const hosts = new Set<string>();
  for (const value of [...scan.scripts.map((s) => s.src ?? ""), ...scan.stylesheets.map((s) => s.href), ...scan.images.map((i) => i.src)]) {
    const host = hostOf(value, page.url);
    if (host && host !== own) hosts.add(host);
  }
  add("third-party", "Other websites used", 5, hosts.size <= 3 ? 5 : hosts.size <= 8 ? 3 : 0, hosts.size === 0 ? "The page loads its scripts, styles and images from its own site." : `The page loads files from ${hosts.size} other site${hosts.size === 1 ? "" : "s"}. Each one needs its own connection.`);

  const https = page.url.startsWith("https://");
  add("https", "Secure (HTTPS)", 5, https ? 5 : 0, https ? "The page uses HTTPS." : "The page is not served over HTTPS.");

  const score = checks.reduce((sum, check) => sum + check.points, 0);
  return { url: page.url, score, verdict: score >= 80 ? "good" : score >= 50 ? "needs_work" : "poor", checks, note: NOTE };
}