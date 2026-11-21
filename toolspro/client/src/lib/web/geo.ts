// IP ke maqam ko likhne ke chhote madadgar. IP se jagah sirf andaza hoti hai, is liye position 2 ashariya tak dikhate hain.

export function formatPlace(parts: { city: string | null; region: string | null; country: string | null }): string {
  const seen: string[] = [];
  for (const part of [parts.city, parts.region, parts.country]) {
    if (part && !seen.includes(part)) seen.push(part);
  }
  return seen.join(", ");
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

// OpenStreetMap ka link (naya tab). Map yahan nahi kholta, sirf link hai.
export function mapLink(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=9/${lat}/${lon}`;
}