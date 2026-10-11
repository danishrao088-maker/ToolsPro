import { isIP } from "node:net";

// Ye file SSRF se bachaati hai: server ko aisi IP par jaane se rokti hai jo public internet ki nahi
// (apna computer, ghar/office ka network, cloud ka metadata address wagaira).
// Agar IP samajh na aaye to hum use block kar dete hain (fail closed).

function parseIPv4(text: string): [number, number, number, number] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    nums.push(n);
  }
  return [nums[0]!, nums[1]!, nums[2]!, nums[3]!];
}

function isBlockedIPv4Parts(a: number, b: number, c: number): boolean {
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (cloud metadata yahin hota hai)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol
  if (a === 192 && b === 0 && c === 2) return true; // documentation
  if (a === 192 && b === 88 && c === 99) return true; // 6to4 relay
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // documentation
  if (a === 203 && b === 0 && c === 113) return true; // documentation
  if (a >= 224) return true; // multicast aur reserved (255.255.255.255 bhi)
  return false;
}

function toGroups(part: string): number[] | null {
  if (part === "") return [];
  const out: number[] = [];
  const pieces = part.split(":");
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i]!;
    if (i === pieces.length - 1 && piece.includes(".")) {
      const v4 = parseIPv4(piece);
      if (!v4) return null;
      out.push(v4[0] * 256 + v4[1], v4[2] * 256 + v4[3]);
    } else {
      if (!/^[0-9a-f]{1,4}$/.test(piece)) return null;
      out.push(parseInt(piece, 16));
    }
  }
  return out;
}

function parseIPv6(input: string): number[] | null {
  let text = input.toLowerCase();
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = toGroups(halves[0]!);
  if (!head) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const tail = toGroups(halves[1]!);
  if (!tail) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
}

function embeddedV4Blocked(high: number, low: number): boolean {
  return isBlockedIPv4Parts(high >> 8, high & 255, low >> 8);
}

function isBlockedIPv6(address: string): boolean {
  const g = parseIPv6(address);
  if (!g) return true;
  const firstSixZero = g.slice(0, 6).every((x) => x === 0);
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return embeddedV4Blocked(g[6]!, g[7]!); // ::ffff:a.b.c.d
  if (firstSixZero) return true; // :: , ::1 aur purane ::a.b.c.d
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    // NAT64: andar wali IPv4 dekhte hain
    return g.slice(2, 6).every((x) => x === 0) ? embeddedV4Blocked(g[6]!, g[7]!) : true;
  }
  if (g[0] === 0x100 && g.slice(1, 4).every((x) => x === 0)) return true; // discard
  if (g[0] === 0x2001 && g[1]! <= 0x1ff) return true; // protocol assignments, Teredo, documentation
  if (g[0] === 0x2001 && g[1] === 0xdb8) return true; // documentation
  if (g[0] === 0x2002) return embeddedV4Blocked(g[1]!, g[2]!); // 6to4
  if (g[0] === 0x3fff && (g[1]! & 0xf000) === 0) return true; // documentation
  if (g[0] === 0x5f00) return true; // SRv6
  if ((g[0]! & 0xfe00) === 0xfc00) return true; // unique local
  if ((g[0]! & 0xffc0) === 0xfe80) return true; // link-local
  if ((g[0]! & 0xffc0) === 0xfec0) return true; // site-local
  if ((g[0]! & 0xff00) === 0xff00) return true; // multicast
  return false;
}

// true = ye address private/khaas hai aur server ko wahan nahi jaana chahiye
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const v4 = parseIPv4(address);
    return v4 ? isBlockedIPv4Parts(v4[0], v4[1], v4[2]) : true;
  }
  if (version === 6) return isBlockedIPv6(address);
  return true;
}
