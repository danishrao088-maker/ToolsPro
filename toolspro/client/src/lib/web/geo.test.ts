import { describe, expect, it } from "vitest";
import { formatCoordinates, formatPlace, mapLink } from "./geo";

describe("formatPlace", () => {
  it("joins city, region and country", () => {
    expect(formatPlace({ city: "Mountain View", region: "California", country: "United States" })).toBe("Mountain View, California, United States");
  });
  it("skips missing parts and repeated names", () => {
    expect(formatPlace({ city: null, region: null, country: "Pakistan" })).toBe("Pakistan");
    expect(formatPlace({ city: "Singapore", region: "Singapore", country: "Singapore" })).toBe("Singapore");
    expect(formatPlace({ city: null, region: null, country: null })).toBe("");
  });
});

describe("formatCoordinates", () => {
  it("shows two decimals with N/S and E/W", () => {
    expect(formatCoordinates(37.4056, -122.0775)).toBe("37.41° N, 122.08° W");
    expect(formatCoordinates(-33.8688, 151.2093)).toBe("33.87° S, 151.21° E");
    expect(formatCoordinates(0, 0)).toBe("0.00° N, 0.00° E");
  });
});

describe("mapLink", () => {
  it("builds an OpenStreetMap link", () => {
    expect(mapLink(37.4056, -122.0775)).toBe("https://www.openstreetmap.org/?mlat=37.4056&mlon=-122.0775#map=9/37.4056/-122.0775");
  });
});