import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createGate, createOfficeConverter, runProcess, safeEnv, sofficePath, type RunOptions, type RunResult, type Runner } from "../src/services/officeConvert";

const PDF = Buffer.from("%PDF-1.7\nfake pdf\n%%EOF");
const roots: string[] = [];
function freshBase(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "office-test-"));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Asli LibreOffice ki jagah: `--outdir` mein input.pdf likh deta hai
function fakeRunner(result: Partial<RunResult> = {}, output: Buffer | null = PDF, seen: { args: string[]; options: RunOptions | null; command: string } = { args: [], options: null, command: "" }): Runner {
  return async (command, args, options) => {
    seen.command = command;
    seen.args = args;
    seen.options = options;
    const outDir = args[args.indexOf("--outdir") + 1]!;
    if (output) {
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, "input.pdf"), output);
    }
    return { code: 0, timedOut: false, stderr: "", ...result };
  };
}
const quiet = () => undefined;
const leftovers = (base: string) => readdirSync(base);
const code = (run: () => Promise<unknown>) => run().then(() => "no error", (e: { code?: string }) => e.code ?? "other");

describe("convertToPdf", () => {
  it("returns the PDF, runs LibreOffice safely and cleans up", async () => {
    const base = freshBase();
    const seen = { args: [] as string[], options: null as RunOptions | null, command: "" };
    const converter = createOfficeConverter({ run: fakeRunner({}, PDF, seen), command: "soffice-test", baseDir: base, log: quiet });
    const pdf = await converter.convertToPdf(Buffer.from("doc"), "docx");
    expect(pdf.equals(PDF)).toBe(true);
    expect(seen.command).toBe("soffice-test");
    expect(seen.args).toEqual(expect.arrayContaining(["--headless", "--norestore", "--nolockcheck", "--convert-to", "pdf", "--outdir"]));
    expect(seen.args.some((arg) => arg.startsWith("-env:UserInstallation=file://"))).toBe(true);
    expect(seen.args[seen.args.length - 1]).toMatch(/input\.docx$/);
    expect(leftovers(base)).toEqual([]);
  });
  it("writes the input under a fixed name with the checked extension", async () => {
    const base = freshBase();
    let inputName = "";
    const run: Runner = async (_c, args, options) => {
      inputName = path.basename(args[args.length - 1]!);
      expect(existsSync(args[args.length - 1]!)).toBe(true);
      expect(readFileSync(args[args.length - 1]!).toString()).toBe("data");
      expect(options.cwd).toContain("toolspro-office-");
      return fakeRunner()(_c, args, options);
    };
    await createOfficeConverter({ run, baseDir: base, log: quiet }).convertToPdf(Buffer.from("data"), "xls");
    expect(inputName).toBe("input.xls");
  });
  it("gives LibreOffice only a safe environment", async () => {
    const base = freshBase();
    process.env.SECRET_TEST_VALUE = "do-not-leak";
    const seen = { args: [] as string[], options: null as RunOptions | null, command: "" };
    await createOfficeConverter({ run: fakeRunner({}, PDF, seen), baseDir: base, log: quiet }).convertToPdf(Buffer.from("x"), "docx");
    delete process.env.SECRET_TEST_VALUE;
    expect(Object.keys(seen.options!.env)).not.toContain("SECRET_TEST_VALUE");
    expect(seen.options!.env.HOME).toBe(seen.options!.cwd);
  });
  it("maps failures to clear errors and still cleans up", async () => {
    const base = freshBase();
    const make = (run: Runner) => createOfficeConverter({ run, baseDir: base, log: quiet });
    expect(await code(() => make(fakeRunner({ timedOut: true, code: null }, null)).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_TIMEOUT");
    expect(await code(() => make(fakeRunner({ code: 1, stderr: "boom" }, null)).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_FAILED");
    expect(await code(() => make(fakeRunner({}, null)).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_FAILED"); // exit 0 par bhi PDF nahi bani
    expect(await code(() => make(fakeRunner({}, Buffer.alloc(0))).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_FAILED");
    expect(await code(() => make(fakeRunner({}, Buffer.from("not a pdf at all"))).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_FAILED");
    const missing: Runner = async () => {
      throw Object.assign(new Error("spawn"), { code: "ENOENT" });
    };
    expect(await code(() => make(missing).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERTER_UNAVAILABLE");
    const odd: Runner = async () => {
      throw new Error("weird");
    };
    expect(await code(() => make(odd).convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_FAILED");
    expect(leftovers(base)).toEqual([]);
  });
  it("does not leak a slot when a job fails", async () => {
    const base = freshBase();
    const converter = createOfficeConverter({ run: fakeRunner({ code: 1 }, null), baseDir: base, maxActive: 1, maxWaiting: 0, log: quiet });
    for (let i = 0; i < 3; i += 1) expect(await code(() => converter.convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERT_FAILED");
    expect(converter.stats()).toEqual({ active: 0, waiting: 0 });
  });
  it("limits parallel work, queues a few and then says busy", async () => {
    const base = freshBase();
    let running = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    const run: Runner = async (c, args, options) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise<void>((resolve) => releases.push(resolve));
      running -= 1;
      return fakeRunner()(c, args, options);
    };
    const converter = createOfficeConverter({ run, baseDir: base, maxActive: 2, maxWaiting: 1, log: quiet });
    const jobs = [1, 2, 3].map(() => converter.convertToPdf(Buffer.from("x"), "docx"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(converter.stats()).toEqual({ active: 2, waiting: 1 });
    expect(await code(() => converter.convertToPdf(Buffer.from("x"), "docx"))).toBe("CONVERTER_BUSY");
    while (releases.length < 3) {
      releases.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (releases.length === 0 && converter.stats().active === 0) break;
    }
    for (const release of releases.splice(0)) release();
    const done = await Promise.all(jobs);
    expect(done).toHaveLength(3);
    expect(peak).toBe(2);
    expect(converter.stats()).toEqual({ active: 0, waiting: 0 });
  });
});

describe("createGate", () => {
  it("hands a slot to the next waiter without exceeding the limit", async () => {
    const gate = createGate(1, 2);
    await gate.acquire();
    const order: number[] = [];
    const a = gate.acquire().then(() => order.push(1));
    const b = gate.acquire().then(() => order.push(2));
    await expect(gate.acquire()).rejects.toMatchObject({ code: "CONVERTER_BUSY", statusCode: 503 });
    gate.release();
    await a;
    expect(gate.stats()).toEqual({ active: 1, waiting: 1 });
    gate.release();
    await b;
    gate.release();
    expect(order).toEqual([1, 2]);
    expect(gate.stats()).toEqual({ active: 0, waiting: 0 });
  });
});

describe("sofficePath", () => {
  it("prefers SOFFICE_PATH", () => {
    expect(sofficePath({ SOFFICE_PATH: " D:\\LO\\soffice.exe " }, "win32", () => false)).toBe("D:\\LO\\soffice.exe");
  });
  it("finds the usual Windows install", () => {
    const wanted = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
    expect(sofficePath({ ProgramFiles: "C:\\Program Files" }, "win32", (file) => file === wanted)).toBe(wanted);
    expect(sofficePath({}, "win32", () => false)).toBe("soffice.exe");
  });
  it("uses the command name on Linux and the app path on macOS", () => {
    expect(sofficePath({}, "linux", () => false)).toBe("soffice");
    expect(sofficePath({}, "darwin", () => true)).toBe("/Applications/LibreOffice.app/Contents/MacOS/soffice");
    expect(sofficePath({}, "darwin", () => false)).toBe("soffice");
  });
});

describe("safeEnv", () => {
  it("keeps only what is needed and points temp folders at the work folder", () => {
    const env = safeEnv("/work", { PATH: "/bin", LANG: "en", DB_PASSWORD: "x", MONGO_URI: "y" });
    expect(env).toEqual({ PATH: "/bin", LANG: "en", HOME: "/work", USERPROFILE: "/work", TMPDIR: "/work", TEMP: "/work", TMP: "/work" });
  });
});

// Zombie (maara ja chuka, par parent ne abhi "reap" nahi kiya) ko zinda nahi ginte
function isRunning(pid: number): boolean {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3) !== "Z";
  } catch {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}

// Asli process aur timeout (sirf Linux/macOS par: shell ke bachon ko bhi maarna dekhte hain)
if (process.platform !== "win32") {
  describe("runProcess", () => {
    it("returns the exit code and stderr", async () => {
      const dir = freshBase();
      const result = await runProcess("sh", ["-c", "echo oops 1>&2; exit 3"], { cwd: dir, env: { PATH: process.env.PATH ?? "" }, timeoutMs: 5000 });
      expect(result).toEqual({ code: 3, timedOut: false, stderr: "oops\n" });
    });
    it("reports a missing program as ENOENT", async () => {
      const dir = freshBase();
      await expect(runProcess("definitely-not-a-program-xyz", [], { cwd: dir, env: {}, timeoutMs: 1000 })).rejects.toMatchObject({ code: "ENOENT" });
    });
    it("stops a slow process and its children after the timeout", async () => {
      const dir = freshBase();
      const started = Date.now();
      const result = await runProcess("sh", ["-c", "sleep 30 & echo $! > child.pid; wait"], { cwd: dir, env: { PATH: process.env.PATH ?? "" }, timeoutMs: 400 });
      expect(result.timedOut).toBe(true);
      expect(Date.now() - started).toBeLessThan(5000);
      const pid = Number(readFileSync(path.join(dir, "child.pid"), "utf8").trim());
      await new Promise((resolve) => setTimeout(resolve, 200));
      const alive = isRunning(pid);
      expect(alive).toBe(false);
    });
  });
}