import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "../../components/tools/CopyButton";
import { buildInfoRows, formatReport, type Environment } from "../../lib/tools/browserInfo";

// Browser ke globals sirf yahan padhe jate hain. Logic wali file pure rehti hai, isi liye test ho sakti hai.
function readEnvironment(): Environment {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: [...navigator.languages],
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    cookiesEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

export default function WhatIsMyBrowserTool() {
  const [env, setEnv] = useState<Environment>(readEnvironment);

  // Window ka size ya internet badle to maloomat naya karte hain
  useEffect(() => {
    const update = () => setEnv(readEnvironment());
    window.addEventListener("resize", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const rows = useMemo(() => buildInfoRows(env), [env]);
  const summary = `${rows[0]?.value ?? "Unknown"} on ${rows[1]?.value ?? "Unknown"}`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="text-sm">You are using</p>
        <p className="text-2xl font-semibold text-heading">{summary}</p>
      </div>

      <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 p-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-heading">{row.label}</dt>
            <dd className="break-words text-sm sm:col-span-2">{row.value}</dd>
          </div>
        ))}
      </dl>

      <CopyButton text={formatReport(rows)} />
    </div>
  );
}