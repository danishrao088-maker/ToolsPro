import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { webToolService } from "../services/webToolService";

// Sab web tools ki body ek jaisi hai: { "url": "example.com" }
function readUrl(body: unknown): string {
  const url = (body as { url?: unknown } | null | undefined)?.url;
  if (typeof url !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Enter a web address, for example example.com.");
  }
  return url;
}

function tool(run: (url: string) => Promise<unknown>) {
  return asyncHandler(async (req, res) => {
    const data = await run(readUrl(req.body));
    res.json({ success: true, data });
  });
}

export const checkStatus = tool((url) => webToolService.checkStatus(url));
export const checkRedirects = tool((url) => webToolService.checkRedirects(url));
export const checkDown = tool((url) => webToolService.checkDown(url));
export const pingSite = tool((url) => webToolService.ping(url));
export const analyzeMeta = tool((url) => webToolService.analyzeMeta(url));
export const analyzeOpenGraph = tool((url) => webToolService.analyzeOpenGraph(url));
export const snoopPage = tool((url) => webToolService.snoop(url));
export const seoScore = tool((url) => webToolService.seoScore(url));
