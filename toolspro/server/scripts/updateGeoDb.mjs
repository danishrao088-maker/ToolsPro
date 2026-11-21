// GEO IP Locator ka database (DB-IP "City Lite", mahine mein ek baar naya aata hai) download karta hai.
// Chalane ka tareeqa (server/ folder mein):  npm run geoip:update
// File GEOIP_DB_PATH par jati hai, warna server/data/dbip-city-lite.mmdb par.
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

const configured = process.env.GEOIP_DB_PATH;
const target = configured && configured.trim() !== "" ? path.resolve(configured) : path.resolve(process.cwd(), "data", "dbip-city-lite.mmdb");
const BASE = process.env.GEOIP_DOWNLOAD_BASE || "https://download.db-ip.com/free";
const MIN_BYTES = 1_000_000; // is se chhoti file asli database nahi ho sakti

// Is mahine ki file, aur agar abhi na bani ho to pichle mahine ki
function candidateUrls(now = new Date()) {
  const urls = [];
  for (let back = 0; back < 2; back += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    urls.push(`${BASE}/dbip-city-lite-${month}.mmdb.gz`);
  }
  return urls;
}

async function download(url, file) {
  const response = await fetch(url);
  if (response.status === 404) return false;
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}) for ${url}`);
  await pipeline(Readable.fromWeb(response.body), createGunzip(), createWriteStream(file));
  return true;
}

async function main() {
  mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.download`;
  rmSync(temp, { force: true });

  let source = null;
  for (const url of candidateUrls()) {
    console.log(`Trying ${url}`);
    if (await download(url, temp)) {
      source = url;
      break;
    }
  }
  if (!source) throw new Error("No database file was found for this month or the last one. Check https://db-ip.com/db/download/ip-to-city-lite");

  const size = statSync(temp).size;
  if (size < MIN_BYTES) {
    rmSync(temp, { force: true });
    throw new Error(`The downloaded file is only ${size} bytes, so it was thrown away.`);
  }

  // Jaanch: file ko asal mein kholo aur ek jaana pehchana address dekho. Theek ho tabhi purani file badlo.
  let reader;
  let sample;
  try {
    const { open } = await import("maxmind");
    reader = await open(temp);
    sample = reader.get("8.8.8.8");
    if (!sample || typeof sample !== "object") throw new Error("The new file could not be read, so the old one was kept.");
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
  if (existsSync(target)) rmSync(target);
  renameSync(temp, target);

  const built = reader.metadata?.buildEpoch instanceof Date ? reader.metadata.buildEpoch.toISOString().slice(0, 10) : "unknown";
  console.log(`Saved ${target}`);
  console.log(`Size ${(size / 1024 / 1024).toFixed(1)} MB, built ${built}.`);
  console.log("Test lookup 8.8.8.8:", JSON.stringify({ country: sample.country?.names?.en, city: sample.city?.names?.en }));
  console.log('Data by DB-IP.com (CC BY 4.0). Keep the link "IP Geolocation by DB-IP" on the tool page.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});