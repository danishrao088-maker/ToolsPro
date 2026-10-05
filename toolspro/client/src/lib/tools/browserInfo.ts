export type DeviceType = "Desktop" | "Mobile" | "Tablet" | "Unknown";

export interface UserAgentInfo {
  browser: string;
  browserVersion: string; // sirf major number
  os: string;
  osVersion: string;
  deviceType: DeviceType;
}

// Tarteeb zaroori hai: Edge/Opera/Samsung ki string mein "Chrome" bhi likha hota hai,
// is liye unhein Chrome se pehle check karte hain.
const BROWSERS: { name: string; pattern: RegExp }[] = [
  { name: "Edge", pattern: /\b(?:Edg|EdgA|EdgiOS)\/([\d.]+)/ },
  { name: "Opera", pattern: /\b(?:OPR|OPiOS)\/([\d.]+)/ },
  { name: "Samsung Internet", pattern: /\bSamsungBrowser\/([\d.]+)/ },
  { name: "Firefox", pattern: /\b(?:Firefox|FxiOS)\/([\d.]+)/ },
  { name: "Chrome", pattern: /\b(?:Chrome|CriOS)\/([\d.]+)/ },
  { name: "Safari", pattern: /\bVersion\/([\d.]+).*\bSafari\// },
  { name: "Internet Explorer", pattern: /\bMSIE ([\d.]+)|\bTrident\/.*\brv:([\d.]+)/ },
];

const WINDOWS_VERSIONS: Record<string, string> = {
  "10.0": "10 or 11", // Windows 11 bhi "NT 10.0" batata hai, farq nahi kiya ja sakta
  "6.3": "8.1",
  "6.2": "8",
  "6.1": "7",
};

function detectBrowser(ua: string): { browser: string; browserVersion: string } {
  for (const { name, pattern } of BROWSERS) {
    const match = pattern.exec(ua);
    if (match) {
      const version = match[1] ?? match[2] ?? "";
      return { browser: name, browserVersion: version.split(".")[0] ?? "" };
    }
  }
  return { browser: "Unknown", browserVersion: "" };
}

function detectOs(ua: string): { os: string; osVersion: string } {
  const ios = /\b(?:iPhone|iPad|iPod)\b.*?\bOS (\d+(?:_\d+)*)/.exec(ua);
  if (ios) return { os: /iPad/.test(ua) ? "iPadOS" : "iOS", osVersion: (ios[1] ?? "").replace(/_/g, ".") };

  const android = /\bAndroid (\d+(?:\.\d+)*)/.exec(ua);
  if (android) return { os: "Android", osVersion: android[1] ?? "" };

  const windows = /\bWindows NT (\d+\.\d+)/.exec(ua);
  if (windows) return { os: "Windows", osVersion: WINDOWS_VERSIONS[windows[1] ?? ""] ?? "" };

  if (/\bCrOS\b/.test(ua)) return { os: "ChromeOS", osVersion: "" };
  // Mac ki string mein version hamesha 10_15_7 likha hota hai (jaan boojh kar), is liye nahi dikhate
  if (/\bMac OS X\b/.test(ua)) return { os: "macOS", osVersion: "" };
  if (/\b(?:Linux|X11)\b/.test(ua)) return { os: "Linux", osVersion: "" };
  return { os: "Unknown", osVersion: "" };
}

export function parseUserAgent(ua: string, maxTouchPoints = 0): UserAgentInfo {
  const { browser, browserVersion } = detectBrowser(ua);
  const detected = detectOs(ua);
  let os = detected.os;

  // iPad ka Safari aksar Mac banke aata hai, lekin Mac mein touch screen nahi hoti
  if (os === "macOS" && maxTouchPoints > 1) os = "iPadOS";

  let deviceType: DeviceType = "Desktop";
  if (os === "Unknown") deviceType = "Unknown";
  else if (os === "iPadOS") deviceType = "Tablet";
  else if (os === "iOS") deviceType = "Mobile";
  else if (os === "Android") deviceType = /\bMobile\b/.test(ua) ? "Mobile" : "Tablet";

  return { browser, browserVersion, os, osVersion: detected.osVersion, deviceType };
}

export interface Environment {
  userAgent: string;
  language: string;
  languages: readonly string[];
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  colorScheme: "dark" | "light";
  reducedMotion: boolean;
  cookiesEnabled: boolean;
  online: boolean;
  timeZone: string;
  maxTouchPoints: number;
}

export interface InfoRow {
  label: string;
  value: string;
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");

export function buildInfoRows(env: Environment): InfoRow[] {
  const ua = parseUserAgent(env.userAgent, env.maxTouchPoints);
  return [
    { label: "Browser", value: `${ua.browser} ${ua.browserVersion}`.trim() },
    { label: "Operating system", value: `${ua.os} ${ua.osVersion}`.trim() },
    { label: "Device type", value: ua.deviceType },
    { label: "Language", value: env.language || "Unknown" },
    { label: "All languages", value: env.languages.join(", ") || "Unknown" },
    { label: "Screen size", value: `${env.screenWidth} × ${env.screenHeight} pixels` },
    { label: "Browser window size", value: `${env.viewportWidth} × ${env.viewportHeight} pixels` },
    { label: "Pixel ratio", value: String(env.pixelRatio) },
    { label: "Color scheme", value: env.colorScheme === "dark" ? "Dark" : "Light" },
    { label: "Reduced motion", value: yesNo(env.reducedMotion) },
    { label: "Cookies enabled", value: yesNo(env.cookiesEnabled) },
    { label: "Online", value: yesNo(env.online) },
    { label: "Time zone", value: env.timeZone || "Unknown" },
    { label: "Touch points", value: String(env.maxTouchPoints) },
    { label: "User agent", value: env.userAgent || "Unknown" },
  ];
}

export function formatReport(rows: InfoRow[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}