const STREET_VIEW_BASE = "https://maps.googleapis.com/maps/api/streetview";
const METADATA_BASE = "https://maps.googleapis.com/maps/api/streetview/metadata";

export type StreetViewParams = {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  fov: number;
  width: number;
  height: number;
};

export type StreetViewMetadata = {
  status: string;
  copyright?: string;
  date?: string;
  location?: { lat: number; lng: number };
  pano_id?: string;
};

/** Optimized for reading shop facades, not the road ahead */
export const STOREFRONT_CAPTURE = {
  pitch: -8,
  fov: 55,
  width: 640,
  height: 640,
} as const;

export const ISTANBUL_PRESETS = [
  { name: "Sultanahmet", lat: 41.005409, lng: 28.976814 },
  { name: "Taksim", lat: 41.0369, lng: 28.985 },
  { name: "Kadıköy", lat: 40.9902, lng: 29.0257 },
  { name: "Başakşehir", lat: 41.0934, lng: 28.8024 },
] as const;

export function getApiKey(): string {
  const key = process.env.GOOGLE_STREET_VIEW_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_STREET_VIEW_API_KEY is not configured in .env.local");
  }
  return key;
}

export function parseStreetViewParams(
  searchParams: URLSearchParams,
): StreetViewParams | { error: string } {
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Invalid latitude. Must be between -90 and 90." };
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Invalid longitude. Must be between -180 and 180." };
  }

  const heading = clamp(Number(searchParams.get("heading") ?? 0), 0, 360);
  const pitch = clamp(Number(searchParams.get("pitch") ?? 0), -90, 90);
  const fov = clamp(Number(searchParams.get("fov") ?? 90), 10, 120);
  const width = clamp(Number(searchParams.get("width") ?? 640), 1, 640);
  const height = clamp(Number(searchParams.get("height") ?? 640), 1, 640);

  return { lat, lng, heading, pitch, fov, width, height };
}

export function buildStreetViewUrl(
  params: StreetViewParams,
  apiKey: string,
): string {
  const url = new URL(STREET_VIEW_BASE);
  url.searchParams.set("size", `${params.width}x${params.height}`);
  url.searchParams.set("location", `${params.lat},${params.lng}`);
  url.searchParams.set("heading", String(params.heading));
  url.searchParams.set("pitch", String(params.pitch));
  url.searchParams.set("fov", String(params.fov));
  url.searchParams.set("return_error_code", "true");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

export function buildMetadataUrl(
  lat: number,
  lng: number,
  apiKey: string,
): string {
  const url = new URL(METADATA_BASE);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

export async function fetchStreetViewMetadata(
  lat: number,
  lng: number,
): Promise<StreetViewMetadata> {
  const apiKey = getApiKey();
  const response = await fetch(buildMetadataUrl(lat, lng, apiKey), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`);
  }

  return response.json() as Promise<StreetViewMetadata>;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
