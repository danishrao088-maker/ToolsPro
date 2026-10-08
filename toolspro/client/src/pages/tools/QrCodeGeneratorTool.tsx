import { useMemo, useState } from "react";
import { svgToDataUrl } from "../../lib/image/dataUrl";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { colorWarning, isHexColor } from "../../lib/qr/qrColor";
import { ECC_LEVELS, encodeQr, type EccLevel } from "../../lib/qr/qrEncoder";
import { EMPTY_FIELDS, QR_KINDS, WIFI_SECURITY, buildPayload, type QrFields, type QrKind, type WifiSecurity } from "../../lib/qr/qrPayload";
import { qrToPng } from "../../lib/qr/qrPng";
import { MARGIN_RANGE, qrPixelSize, qrToSvg } from "../../lib/qr/qrRender";

const SIZES = [256, 512, 1024, 2048];
const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const label = "block text-sm font-medium text-heading";

export default function QrCodeGeneratorTool() {
  const [fields, setFields] = useState<QrFields>(EMPTY_FIELDS);
  const [touched, setTouched] = useState(false);
  const [ecc, setEcc] = useState<EccLevel>("M");
  const [margin, setMargin] = useState<number>(MARGIN_RANGE.standard);
  const [size, setSize] = useState(512);
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  function update<K extends keyof QrFields>(key: K, value: QrFields[K]) {
    setTouched(true);
    setFields((current) => ({ ...current, [key]: value }));
  }

  const payload = useMemo(() => buildPayload(fields), [fields]);
  const encoded = useMemo(() => (payload.ok ? encodeQr(payload.text, ecc) : null), [payload, ecc]);
  const qr = encoded?.ok ? encoded.qr : null;

  const colorsValid = isHexColor(foreground) && isHexColor(background);
  const backgroundValue = transparent ? null : background;
  const svg = useMemo(
    () => (qr && colorsValid ? qrToSvg(qr, { margin, foreground, background: backgroundValue }) : ""),
    [qr, colorsValid, margin, foreground, backgroundValue]
  );
  const preview = useMemo(() => (svg ? svgToDataUrl(svg) : ""), [svg]);
  const pixels = qr ? qrPixelSize(qr.size, margin, size).pixels : 0;
  const warning = colorWarning(foreground, transparent ? "#ffffff" : background);

  function downloadSvg() {
    if (svg) downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg");
  }

  async function downloadPng() {
    if (!qr || !colorsValid) return;
    setBusy(true);
    setDownloadError("");
    const blob = await qrToPng(qr, margin, size, foreground, backgroundValue);
    setBusy(false);
    if (blob) downloadBlob(blob, "qr-code.png");
    else setDownloadError("Your browser could not create the PNG. Try a smaller size.");
  }

  const message = !payload.ok ? payload.error : encoded && !encoded.ok ? encoded.error : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <label className={label}>
          What is the code for?
          <select className={`${field} mt-1`} value={fields.kind} onChange={(e) => update("kind", e.target.value as QrKind)}>
            {QR_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        {fields.kind === "text" && (
          <label className={label}>
            Text or link
            <textarea className={`${field} mt-1 min-h-28`} value={fields.text} onChange={(e) => update("text", e.target.value)} placeholder="https://example.com" />
          </label>
        )}

        {fields.kind === "wifi" && (
          <>
            <label className={label}>
              Network name
              <input className={`${field} mt-1`} value={fields.ssid} onChange={(e) => update("ssid", e.target.value)} autoComplete="off" />
            </label>
            <label className={label}>
              Security
              <select className={`${field} mt-1`} value={fields.security} onChange={(e) => update("security", e.target.value as WifiSecurity)}>
                {WIFI_SECURITY.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {fields.security !== "nopass" && (
              <label className={label}>
                Password
                <input className={`${field} mt-1`} value={fields.password} onChange={(e) => update("password", e.target.value)} autoComplete="off" />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" className="accent-primary" checked={fields.hidden} onChange={(e) => update("hidden", e.target.checked)} />
              This is a hidden network
            </label>
          </>
        )}

        {fields.kind === "email" && (
          <>
            <label className={label}>
              Email address
              <input type="email" className={`${field} mt-1`} value={fields.emailTo} onChange={(e) => update("emailTo", e.target.value)} />
            </label>
            <label className={label}>
              Subject (optional)
              <input className={`${field} mt-1`} value={fields.emailSubject} onChange={(e) => update("emailSubject", e.target.value)} />
            </label>
            <label className={label}>
              Message (optional)
              <textarea className={`${field} mt-1 min-h-20`} value={fields.emailBody} onChange={(e) => update("emailBody", e.target.value)} />
            </label>
          </>
        )}

        {fields.kind === "phone" && (
          <label className={label}>
            Phone number
            <input type="tel" className={`${field} mt-1`} value={fields.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+92 300 1234567" />
          </label>
        )}

        <fieldset className="space-y-4 rounded-lg border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-heading">Look and size</legend>
          <label className={label}>
            Error correction
            <select className={`${field} mt-1`} value={ecc} onChange={(e) => setEcc(e.target.value as EccLevel)}>
              {ECC_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-body">Higher levels still scan when the code is dirty or damaged, but they make the code more crowded.</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Image size
              <select className={`${field} mt-1`} value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    About {s} px
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Empty border: {margin} {margin === 1 ? "module" : "modules"}
              <input type="range" min={MARGIN_RANGE.min} max={MARGIN_RANGE.max} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="mt-2 w-full accent-primary" />
            </label>
            <label className={label}>
              Code colour
              <input type="color" value={isHexColor(foreground) ? foreground : "#000000"} onChange={(e) => setForeground(e.target.value)} className="mt-1 block h-10 w-20 rounded border border-line" />
            </label>
            <div className="space-y-2">
              <label className={label}>
                Background colour
                <input type="color" value={isHexColor(background) ? background : "#ffffff"} onChange={(e) => setBackground(e.target.value)} disabled={transparent} className="mt-1 block h-10 w-20 rounded border border-line disabled:opacity-50" />
              </label>
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" className="accent-primary" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
                Transparent background
              </label>
            </div>
          </div>
          {margin < MARGIN_RANGE.standard && <p className="text-sm text-body">Scanners work best with an empty border of at least 4 modules. A smaller border may stop some phones from reading the code.</p>}
          {warning && <p role="alert" className="text-sm text-danger">{warning}</p>}
        </fieldset>
      </div>

      <div className="space-y-4" aria-live="polite">
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-line bg-surface-muted p-4">
          {preview ? (
            <img src={preview} alt="Your QR code" className="h-auto w-full max-w-xs bg-white [image-rendering:pixelated]" />
          ) : (
            <p className="text-center text-sm text-body">{touched && message ? "" : "Your QR code will appear here as you type."}</p>
          )}
        </div>

        {message && touched && <p role="alert" className="text-danger">{message}</p>}
        {payload.ok && payload.note && <p className="text-sm text-body">{payload.note}</p>}

        {qr && svg && (
          <>
            <p className="text-sm text-body">
              {qr.size} × {qr.size} modules (version {qr.version}). The PNG will be {pixels} × {pixels} px.
              {qr.version > 15 && " This code is crowded. Print it large, or shorten the text so it scans more easily."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void downloadPng()} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
                {busy ? "Preparing…" : "Download PNG"}
              </button>
              <button type="button" onClick={downloadSvg} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                Download SVG
              </button>
            </div>
            {downloadError && <p role="alert" className="text-danger">{downloadError}</p>}
            <p className="text-sm text-body">Always scan the finished code with your own phone before you print it or share it.</p>
          </>
        )}
      </div>
    </div>
  );
}