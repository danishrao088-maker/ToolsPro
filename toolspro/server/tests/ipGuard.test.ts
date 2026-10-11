import { describe, expect, it } from "vitest";
import { isBlockedAddress } from "../src/utils/ipGuard";

describe("isBlockedAddress", () => {
  it("blocks private and special IPv4 addresses", () => {
    for (const ip of [
      "0.0.0.0", "10.0.0.1", "10.255.255.255", "100.64.0.1", "127.0.0.1", "127.1.2.3",
      "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "192.0.0.5", "192.0.2.1",
      "198.18.0.1", "198.51.100.7", "203.0.113.9", "224.0.0.1", "240.0.0.1", "255.255.255.255",
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("allows normal public IPv4 addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1", "198.20.0.1", "223.255.255.255"]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it("blocks private and special IPv6 addresses", () => {
    for (const ip of [
      "::", "::1", "fe80::1", "fe80::1%eth0", "fc00::1", "fd12:3456::1", "fec0::1", "ff02::1",
      "2001:db8::1", "2001::1", "2001:1::1", "100::1", "5f00::1", "3fff::1",
      "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:169.254.169.254",
      "64:ff9b::7f00:1", "64:ff9b::a00:1", "64:ff9b:1::1", "2002:7f00:1::1", "2002:a9fe:a9fe::1", "::127.0.0.1",
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("allows public IPv6 addresses", () => {
    for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "2a00:1450:4001:81b::200e", "::ffff:8.8.8.8", "64:ff9b::808:808"]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it("blocks anything that is not an IP address", () => {
    for (const bad of ["", "localhost", "example.com", "999.1.1.1", "1.2.3", "::g", "1:2:3:4:5:6:7:8:9", "1::2::3"]) {
      expect(isBlockedAddress(bad), bad).toBe(true);
    }
  });
});
