import { existsSync } from "node:fs";
import path from "node:path";
import type { GeoReader } from "./geoIp";

// Database file kahan hai: GEOIP_DB_PATH se, warna server/data/dbip-city-lite.mmdb.
// Ye file `npm run geoip:update` se aati hai. `maxmind` package sirf pehli lookup par load hota hai.

export function geoDbPath(): string {
  const configured = process.env.GEOIP_DB_PATH;
  return configured && configured.trim() !== "" ? path.resolve(configured) : path.resolve(process.cwd(), "data", "dbip-city-lite.mmdb");
}

export async function openGeoReader(file: string = geoDbPath()): Promise<GeoReader> {
  if (!existsSync(file)) throw new Error(`The location database file was not found at ${file}.`);
  const maxmind = await import("maxmind");
  return (await maxmind.open(file)) as unknown as GeoReader;
}