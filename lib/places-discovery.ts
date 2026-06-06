import type { BusinessCategory, OpportunitySummary } from "@/lib/bulan";
import type { AreaBounds } from "@/lib/area";
import { boundsCenter, measureBounds } from "@/lib/area";
import {
  matchPlaceToCategory,
  nearbySearchByType,
  type NearbyPlace,
} from "@/lib/google-maps";
export type DiscoveredPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
  category: BusinessCategory | null;
  objectType: "competitor" | "shop" | "unknown";
  vicinity?: string;
  source: "google_places";
};

const DISCOVERY_TYPES = [
  "cafe",
  "pharmacy",
  "supermarket",
  "grocery_or_supermarket",
  "convenience_store",
  "restaurant",
  "meal_takeaway",
  "hair_care",
  "beauty_salon",
  "store",
  "clothing_store",
  "hardware_store",
  "home_goods_store",
  "electrician",
] as const;

function isInsideBounds(
  lat: number,
  lng: number,
  bounds: AreaBounds,
): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function boundsSearchRadius(bounds: AreaBounds): number {
  const { widthM, heightM } = measureBounds(bounds);
  const diagonal = Math.hypot(widthM, heightM);
  return Math.min(800, Math.max(120, Math.ceil(diagonal / 2) + 60));
}

function toDiscoveredPlace(
  place: NearbyPlace,
  targetCategory: BusinessCategory,
): DiscoveredPlace {
  const category = matchPlaceToCategory(place);
  let objectType: DiscoveredPlace["objectType"] = "unknown";
  if (category === targetCategory) objectType = "competitor";
  else if (category) objectType = "shop";

  return {
    placeId: place.placeId,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    types: place.types,
    category,
    objectType,
    vicinity: place.vicinity,
    source: "google_places",
  };
}

/** Discover registered businesses inside a map rectangle via Google Places (primary source of truth). */
export async function discoverPlacesInBounds(
  bounds: AreaBounds,
  targetCategory: BusinessCategory,
): Promise<DiscoveredPlace[]> {
  const center = boundsCenter(bounds);
  const radiusM = boundsSearchRadius(bounds);
  const seen = new Map<string, DiscoveredPlace>();

  for (const type of DISCOVERY_TYPES) {
    const batch = await nearbySearchByType(
      center.lat,
      center.lng,
      radiusM,
      type,
    );

    for (const place of batch) {
      if (!isInsideBounds(place.lat, place.lng, bounds)) continue;
      if (seen.has(place.placeId)) continue;

      seen.set(place.placeId, toDiscoveredPlace(place, targetCategory));
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeDiscoveredPlaces(
  places: DiscoveredPlace[],
  targetCategory: BusinessCategory,
): OpportunitySummary {
  const competitors = places.filter((p) => p.objectType === "competitor").length;
  const shops = places.filter((p) => p.objectType === "shop").length;
  const unknown = places.filter((p) => p.objectType === "unknown").length;

  const competitionPenalty = competitors * 10;
  const diversityBonus = shops > 0 ? 15 : 0;
  const gapBonus = competitors === 0 ? 35 : 0;
  const opportunityScore = Math.max(
    0,
    Math.min(100, 45 + gapBonus + diversityBonus - competitionPenalty),
  );

  return {
    vacant: 0,
    for_rent: 0,
    for_sale: 0,
    competitors,
    shops,
    unknown,
    uniqueBusinesses: places.length,
    opportunityScore: Math.round(opportunityScore),
  };
}

export function placeToDetection(place: DiscoveredPlace, targetCategory: BusinessCategory) {
  return {
    objectType: place.objectType,
    businessCategory: place.category ?? targetCategory,
    confidence: 0.97,
    signText: place.name,
    placesName: place.name,
    placesPlaceId: place.placeId,
    placesTypes: place.types,
    placesVerified: true,
    caption: `Google Places registry: ${place.name}${place.category ? ` (${place.category.replace("_", " ")})` : ""}`,
  };
}
