import { normalizeTrip, type TripState } from "./model";

/** UTF-8 JSON, then standard base64, so Hebrew names survive the URL hash. */
export function encodeTrip(state: TripState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeTrip(payload: string): TripState | null {
  try {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;
    const json = new TextDecoder().decode(bytes);
    return normalizeTrip(JSON.parse(json));
  } catch {
    return null;
  }
}

export function tripFromHash(hash: string): TripState | null {
  let raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Keep the raw hash when it is not percent-encoded.
  }
  return decodeTrip(raw);
}
