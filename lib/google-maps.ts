import type { BusinessCategory } from "@/lib/bulan";
import type { AreaBounds } from "@/lib/area";
import { measureBounds } from "@/lib/area";
import type { DrivingRoute, LatLng } from "@/lib/route";
import { getApiKey } from "@/lib/streetview";

const DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";
const PLACES_NEARBY_BASE =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

export type NearbyPlace = {
  placeId: string;
  name: string;
  types: string[];
  vicinity?: string;
  businessStatus?: string;
};

/** Decode Google's encoded polyline (Directions overview_polyline). */
export function decodePolyline(encoded: string): LatLng[] {
  const coordinates: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

type DirectionsResponse = {
  status: string;
  routes?: Array<{
    legs?: Array<{
      distance: { value: number };
      duration: { value: number };
      steps?: Array<{ html_instructions?: string; distance: { value: number } }>;
    }>;
    overview_polyline: { points: string };
  }>;
  error_message?: string;
};

export async function fetchGoogleDirections(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[] = [],
): Promise<DrivingRoute> {
  const url = new URL(DIRECTIONS_BASE);
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", getApiKey());

  if (waypoints.length > 0) {
    url.searchParams.set(
      "waypoints",
      waypoints.map((point) => `${point.lat},${point.lng}`).join("|"),
    );
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Directions request failed with status ${response.status}`);
  }

  const body = (await response.json()) as DirectionsResponse;
  if (body.status !== "OK" || !body.routes?.[0]) {
    throw new Error(body.error_message ?? `Directions status: ${body.status}`);
  }

  const route = body.routes[0];
  const leg = route.legs?.[0];
  const coordinates = decodePolyline(route.overview_polyline.points);

  const roadNames = (leg?.steps ?? [])
    .map((step) => step.html_instructions?.replace(/<[^>]+>/g, "")?.trim())
    .filter((name): name is string => Boolean(name));

  return {
    coordinates,
    distanceM: leg?.distance.value ?? 0,
    durationS: leg?.duration.value ?? 0,
    roadNames,
  };
}

function appendCoordinates(target: LatLng[], segment: LatLng[]): LatLng[] {
  for (const point of segment) {
    const last = target[target.length - 1];
    if (
      !last ||
      Math.abs(last.lat - point.lat) > 1e-6 ||
      Math.abs(last.lng - point.lng) > 1e-6
    ) {
      target.push(point);
    }
  }
  return target;
}

/** Cover an area with real driving polylines (boustrophedon row scans). */
export async function fetchAreaRoadNetwork(bounds: AreaBounds): Promise<DrivingRoute> {
  const { heightM, widthM } = measureBounds(bounds);
  const rowCount = Math.min(
    5,
    Math.max(2, Math.round(Math.max(heightM, widthM) / 120)),
  );

  const merged: LatLng[] = [];
  let distanceM = 0;
  let durationS = 0;
  const roadNames: string[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    const ratio = rowCount === 1 ? 0.5 : row / (rowCount - 1);
    const lat = bounds.south + (bounds.north - bounds.south) * ratio;
    const left = { lat, lng: bounds.west };
    const right = { lat, lng: bounds.east };
    const origin = row % 2 === 0 ? left : right;
    const destination = row % 2 === 0 ? right : left;

    try {
      const leg = await fetchGoogleDirections(origin, destination);
      const segment =
        row % 2 === 1 ? [...leg.coordinates].reverse() : leg.coordinates;
      appendCoordinates(merged, segment);
      distanceM += leg.distanceM;
      durationS += leg.durationS;
      roadNames.push(...leg.roadNames);
    } catch {
      // Skip rows that don't resolve to a drivable path.
    }
  }

  if (merged.length < 2) {
    throw new Error("Google Directions could not resolve roads inside this area.");
  }

  return {
    coordinates: merged,
    distanceM,
    durationS,
    roadNames: [...new Set(roadNames)],
  };
}

type PlacesNearbyResponse = {
  status: string;
  results?: Array<{
    place_id: string;
    name: string;
    types?: string[];
    vicinity?: string;
    business_status?: string;
  }>;
  error_message?: string;
};

const CATEGORY_PLACES_QUERY: Record<
  BusinessCategory,
  { types: string[]; keywords: string[] }
> = {
  pharmacy: { types: ["pharmacy"], keywords: ["eczane", "pharmacy"] },
  grocery: {
    types: ["supermarket", "grocery_or_supermarket", "convenience_store"],
    keywords: ["migros", "bim", "a101", "carrefour", "market", "supermarket"],
  },
  coffee_shop: {
    types: ["cafe", "bakery"],
    keywords: ["coffee", "kahve", "starbucks", "espresso", "cafe"],
  },
  restaurant: {
    types: ["restaurant", "meal_takeaway", "food"],
    keywords: ["restaurant", "restoran", "lokanta", "kebab"],
  },
  barber: {
    types: ["hair_care", "beauty_salon"],
    keywords: ["berber", "kuaför", "barber", "salon"],
  },
  retail: {
    types: ["store", "shopping_mall", "clothing_store", "department_store"],
    keywords: ["mağaza", "magaza", "butik", "shop"],
  },
  electrician: {
    types: ["electrician", "hardware_store", "home_goods_store"],
    keywords: ["elektrik", "electric", "hardware"],
  },
};

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusM = 40,
): Promise<NearbyPlace[]> {
  const url = new URL(PLACES_NEARBY_BASE);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url.toString());
  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as PlacesNearbyResponse;
  if (body.status !== "OK" || !body.results?.length) {
    return [];
  }

  return body.results.map((place) => ({
    placeId: place.place_id,
    name: place.name,
    types: place.types ?? [],
    vicinity: place.vicinity,
    businessStatus: place.business_status,
  }));
}

export function matchPlaceToCategory(
  place: NearbyPlace,
): BusinessCategory | null {
  const name = place.name.toLowerCase();

  for (const [category, config] of Object.entries(CATEGORY_PLACES_QUERY) as Array<
    [BusinessCategory, { types: string[]; keywords: string[] }]
  >) {
    const typeHit = config.types.some((type) => place.types.includes(type));
    const keywordHit = config.keywords.some((keyword) => name.includes(keyword));
    if (typeHit || keywordHit) {
      return category;
    }
  }

  return null;
}

export function findBestPlaceForCategory(
  places: NearbyPlace[],
  businessCategory: BusinessCategory,
): NearbyPlace | null {
  const config = CATEGORY_PLACES_QUERY[businessCategory];
  let best: { place: NearbyPlace; score: number } | null = null;

  for (const place of places) {
    let score = 0;
    const name = place.name.toLowerCase();

    if (config.types.some((type) => place.types.includes(type))) score += 3;
    if (config.keywords.some((keyword) => name.includes(keyword))) score += 4;
    if (place.businessStatus === "OPERATIONAL") score += 1;

    if (!best || score > best.score) {
      best = { place, score };
    }
  }

  return best && best.score > 0 ? best.place : null;
}
