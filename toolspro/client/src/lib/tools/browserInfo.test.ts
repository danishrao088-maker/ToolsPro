import { describe, expect, it } from "vitest";
import { buildInfoRows, formatReport, parseUserAgent, type Environment } from "./browserInfo";

const CASES: { name: string; ua: string; expected: [string, string, string, string] }[] = [
  {
    name: "Chrome on Windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    expected: ["Chrome", "124", "Windows", "Desktop"],
  },
  {
    name: "Edge on Windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67",
    expected: ["Edge", "124", "Windows", "Desktop"],
  },
  {
    name: "Opera on Windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0",
    expected: ["Opera", "110", "Windows", "Desktop"],
  },
  {
    name: "Firefox on Windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    expected: ["Firefox", "125", "Windows", "Desktop"],
  },
  {
    name: "Safari on Mac",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    expected: ["Safari", "17", "macOS", "Desktop"],
  },
  {
    name: "Firefox on Linux",
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    expected: ["Firefox", "125", "Linux", "Desktop"],
  },
  {
    name: "Chrome on ChromeOS",
    ua: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    expected: ["Chrome", "124", "ChromeOS", "Desktop"],
  },
  {
    name: "Safari on iPhone",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    expected: ["Safari", "17", "iOS", "Mobile"],
  },
  {
    name: "Chrome on iPhone",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
    expected: ["Chrome", "124", "iOS", "Mobile"],
  },
  {
    name: "Chrome on an Android phone",
    ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    expected: ["Chrome", "124", "Android", "Mobile"],
  },
  {
    name: "Samsung Internet",
    ua: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
    expected: ["Samsung Internet", "24", "Android", "Mobile"],
  },
  {
    name: "Chrome on an Android tablet",
    ua: "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    expected: ["Chrome", "124", "Android", "Tablet"],
  },
  {
    name: "Internet Explorer 11",
    ua: "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko",
    expected: ["Internet Explorer", "11", "Windows", "Desktop"],
  },
];

const sampleEnv: Environment = {
  userAgent: CASES[0]?.ua ?? "",
  language: "en-US",
  languages: ["en-US", "ur"],
  screenWidth: 1920,
  screenHeight: 1080,
  viewportWidth: 1280,
  viewportHeight: 720,
  pixelRatio: 1.5,
  colorScheme: "dark",
  reducedMotion: false,
  cookiesEnabled: true,
  online: true,
  timeZone: "Asia/Karachi",
  maxTouchPoints: 0,
};

describe("parseUserAgent", () => {
  it("recognizes common browsers, systems and devices", () => {
    for (const { name, ua, expected } of CASES) {
      const info = parseUserAgent(ua);
      expect([info.browser, info.browserVersion, info.os, info.deviceType], name).toEqual(expected);
    }
  });

  it("reads operating system versions where the browser reports them", () => {
    expect(parseUserAgent(CASES[0]?.ua ?? "").osVersion).toBe("10 or 11");
    expect(parseUserAgent(CASES[7]?.ua ?? "").osVersion).toBe("17.4.1");
    expect(parseUserAgent(CASES[9]?.ua ?? "").osVersion).toBe("10");
    expect(parseUserAgent(CASES[12]?.ua ?? "").osVersion).toBe("7");
    expect(parseUserAgent(CASES[4]?.ua ?? "").osVersion).toBe(""); // Mac: browser version chhupata hai
  });

  it("detects an iPad that pretends to be a Mac", () => {
    const macUa = CASES[4]?.ua ?? "";
    expect(parseUserAgent(macUa, 0)).toMatchObject({ os: "macOS", deviceType: "Desktop" });
    expect(parseUserAgent(macUa, 5)).toMatchObject({ os: "iPadOS", deviceType: "Tablet" });
  });

  it("returns Unknown for empty or unrecognized text", () => {
    expect(parseUserAgent("")).toEqual({
      browser: "Unknown",
      browserVersion: "",
      os: "Unknown",
      osVersion: "",
      deviceType: "Unknown",
    });
    expect(parseUserAgent("curl/8.0").browser).toBe("Unknown");
  });
});

describe("buildInfoRows", () => {
  it("builds readable rows", () => {
    const rows = buildInfoRows(sampleEnv);
    const get = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(get("Browser")).toBe("Chrome 124");
    expect(get("Operating system")).toBe("Windows 10 or 11");
    expect(get("Device type")).toBe("Desktop");
    expect(get("All languages")).toBe("en-US, ur");
    expect(get("Screen size")).toBe("1920 × 1080 pixels");
    expect(get("Color scheme")).toBe("Dark");
    expect(get("Cookies enabled")).toBe("Yes");
    expect(get("Time zone")).toBe("Asia/Karachi");
  });

  it("shows Unknown instead of empty values", () => {
    const rows = buildInfoRows({ ...sampleEnv, userAgent: "", language: "", languages: [], timeZone: "" });
    const get = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(get("Browser")).toBe("Unknown");
    expect(get("Language")).toBe("Unknown");
    expect(get("All languages")).toBe("Unknown");
    expect(get("Time zone")).toBe("Unknown");
  });
});

describe("formatReport", () => {
  it("puts one label and value on each line", () => {
    expect(formatReport([{ label: "A", value: "1" }, { label: "B", value: "2" }])).toBe("A: 1\nB: 2");
  });
});