import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AppError } from "../utils/AppError";

// Word / Excel / PowerPoint ko LibreOffice (headless) se PDF banata hai.
// Har kaam apne naye temp folder mein hota hai aur khatam hote hi (kamyab ho ya na-kamyab) folder hata diya jata hai.

export interface RunOptions {
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}
export interface RunResult {
  code: number | null;
  timedOut: boolean;
  stderr: string;
}
export type Runner = (command: string, args: string[], options: RunOptions) => Promise<RunResult>;

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 80 * 1024 * 1024;

export function sofficePath(env: NodeJS.ProcessEnv = process.env, platform: string = process.platform, exists: (file: string) => boolean = existsSync): string {
  const configured = env.SOFFICE_PATH?.trim();
  if (configured) return configured;
  if (platform === "win32") {
    const bases = [env.ProgramFiles, env["ProgramFiles(x86)"], "C:\\Program Files", "C:\\Program Files (x86)"].filter((base): base is string => !!base);
    for (const base of bases) {
      const candidate = path.win32.join(base, "LibreOffice", "program", "soffice.exe");
      if (exists(candidate)) return candidate;
    }
    return "soffice.exe";
  }
  if (platform === "darwin") {
    const mac = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    if (exists(mac)) return mac;
  }
  return "soffice";
}

// LibreOffice ko poora server environment (jis mein secrets ho sakte hain) nahi dete: sirf zaroori cheezen.
export function safeEnv(workDir: string, base: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ["PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "windir", "LANG", "LC_ALL", "FONTCONFIG_PATH"]) {
    const value = base[key];
    if (value !== undefined) env[key] = value;
  }
  env.HOME = workDir;
  env.USERPROFILE = workDir;
  env.TMPDIR = workDir;
  env.TEMP = workDir;
  env.TMP = workDir;
  return env;
}

function killTree(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      process.kill(-child.pid, "SIGKILL"); // poora process group (soffice ka wrapper aur soffice.bin)
    }
  } catch {
    child.kill("SIGKILL");
  }
}

export const runProcess: Runner = (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "ignore", "pipe"],
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < 4000) stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
      setTimeout(() => finish(() => resolve({ code: null, timedOut: true, stderr })), 2000).unref();
    }, options.timeoutMs);
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", (code) => finish(() => resolve({ code, timedOut, stderr })));
  });

// Ek waqt mein kitne kaam chalen, aur kitne intezar karein. Is se zyada ho to "busy" kehte hain.
export function createGate(maxActive: number, maxWaiting: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return {
    async acquire(): Promise<void> {
      if (active < maxActive) {
        active += 1;
        return;
      }
      if (waiting.length >= maxWaiting) {
        throw new AppError(503, "CONVERTER_BUSY", "The converter is busy right now. Please try again in a minute.");
      }
      await new Promise<void>((resolve) => waiting.push(resolve)); // slot seedha haath badal jata hai
    },
    release(): void {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    },
    stats: () => ({ active, waiting: waiting.length }),
  };
}

export interface ConverterOptions {
  run?: Runner;
  command?: string;
  timeoutMs?: number;
  maxActive?: number;
  maxWaiting?: number;
  baseDir?: string;
  log?: (message: string) => void;
}

export function createOfficeConverter(options: ConverterOptions = {}) {
  const run = options.run ?? runProcess;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const gate = createGate(options.maxActive ?? 2, options.maxWaiting ?? 4);
  const log = options.log ?? ((message: string) => console.error(message));

  async function convertToPdf(input: Buffer, ext: string): Promise<Buffer> {
    await gate.acquire();
    const dir = await mkdtemp(path.join(options.baseDir ?? tmpdir(), "toolspro-office-")).catch((error: unknown) => {
      gate.release();
      throw error;
    });
    try {
      const inputFile = path.join(dir, `input.${ext}`);
      const outDir = path.join(dir, "out");
      await writeFile(inputFile, input, { mode: 0o600 });

      const args = [
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--nofirststartwizard",
        `-env:UserInstallation=${pathToFileURL(path.join(dir, "profile")).href}`,
        "--convert-to",
        "pdf",
        "--outdir",
        outDir,
        inputFile,
      ];

      let result: RunResult;
      try {
        result = await run(options.command ?? sofficePath(), args, { cwd: dir, env: safeEnv(dir), timeoutMs });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          log("[office-convert] LibreOffice was not found. Set SOFFICE_PATH or install LibreOffice.");
          throw new AppError(503, "CONVERTER_UNAVAILABLE", "The document converter is not available on this server right now. Please try again later.");
        }
        throw new AppError(502, "CONVERT_FAILED", "The conversion could not be started. Please try again later.");
      }

      if (result.timedOut) {
        throw new AppError(504, "CONVERT_TIMEOUT", "The conversion took too long and was stopped. Try a smaller or simpler file.");
      }

      const outFile = path.join(outDir, "input.pdf");
      const failed = new AppError(422, "CONVERT_FAILED", "The file could not be converted. It may be damaged, password-protected or in an unsupported format.");
      if (result.code !== 0) {
        log(`[office-convert] exit ${result.code}: ${result.stderr.trim().slice(0, 300)}`);
        throw failed;
      }
      const info = await stat(outFile).catch(() => null);
      if (!info || info.size === 0) throw failed;
      if (info.size > MAX_OUTPUT_BYTES) {
        throw new AppError(422, "RESULT_TOO_LARGE", "The converted PDF would be too large. Try a smaller file.");
      }
      const pdf = await readFile(outFile);
      if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw failed;
      return pdf;
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }).catch(() => undefined);
      gate.release();
    }
  }

  return { convertToPdf, stats: gate.stats };
}

export const officeConverter = createOfficeConverter();