import { nearbySearchByType, type NearbyPlace } from "@/lib/google-maps";
import type { RouteMood } from "@/lib/monumation";
import {
  closestPointOnPolyline,
  haversineDistance,
  samplePolylineEvenly,
  type LatLng,
} from "@/lib/route";

export type MoodPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
  mood: RouteMood;
  vicinity?: string;
  distanceToRouteM: number;
};

const MOOD_PLACE_TYPES: Record<RouteMood, string[]> = {
  heritage: [
    "tourist_attraction",
    "museum",
    "church",
    "mosque",
    "art_gallery",
    "city_hall",
  ],
  scenic: ["park", "campground", "natural_feature"],
  arts: ["art_gallery", "museum", "library", "movie_theater"],
  promenade: ["cafe", "restaurant", "bakery", "shopping_mall", "book_store"],
};

const MOOD_KEYWORDS: Record<RouteMood, string[]> = {
  heritage: [
    "ayasofya",
    "hagia",
    "topkapı",
    "topkapi",
    "sultan",
    "cami",
    "mosque",
    "müze",
    "muze",
    "museum",
    "palace",
    "kale",
  ],
  scenic: ["park", "bahçe", "bahce", "koru", "yeşil", "yesil", "göl", "gol"],
  arts: ["galeri", "gallery", "sanat", "art", "mural", "kültür", "kultur"],
  promenade: [
    "çarşı",
    "carsi",
    "sokak",
    "caddesi",
    "avm",
    "mall",
    "balık",
    "balik",
    "pazar",
  ],
};

export type CorridorComparePair = {
  mood: RouteMood;
  good: { name: string; start: LatLng; end: LatLng; tip: string };
  weak: { name: string; start: LatLng; end: LatLng; tip: string };
};

/** Preset good vs weak corridors for live demo comparison. */
export const CORRIDOR_COMPARE_PAIRS: CorridorComparePair[] = [
  {
    mood: "heritage",
    good: {
      name: "Sultanahmet → Eminönü",
      start: { lat: 41.0086, lng: 28.9802 },
      end: { lat: 41.0172, lng: 28.9745 },
      tip: "Mosques, bazaars, waterfront heritage core.",
    },
    weak: {
      name: "Başakşehir commercial strip",
      start: { lat: 41.0934, lng: 28.8024 },
      end: { lat: 41.1012, lng: 28.8098 },
      tip: "Generic suburban retail — few heritage POIs.",
    },
  },
  {
    mood: "scenic",
    good: {
      name: "Maçka Park → Bebek",
      start: { lat: 41.0467, lng: 28.9934 },
      end: { lat: 41.0775, lng: 29.0433 },
      tip: "Bosphorus parks and tree canopy.",
    },
    weak: {
      name: "E-5 adjacent stretch",
      start: { lat: 41.062, lng: 28.987 },
      end: { lat: 41.058, lng: 29.012 },
      tip: "High-speed arterial — asphalt over green.",
    },
  },
  {
    mood: "promenade",
    good: {
      name: "Kadıköy Moda → Bahariye",
      start: { lat: 40.9842, lng: 29.0254 },
      end: { lat: 40.9908, lng: 29.0295 },
      tip: "Café terraces and pedestrian life.",
    },
    weak: {
      name: "Warehouse district crossing",
      start: { lat: 41.002, lng: 28.952 },
      end: { lat: 41.008, lng: 28.962 },
      tip: "Industrial crossing with sparse café culture.",
    },
  },
  {
    mood: "arts",
    good: {
      name: "Karaköy → İstiklal side streets",
      start: { lat: 41.0256, lng: 28.9744 },
      end: { lat: 41.0342, lng: 28.9778 },
      tip: "Galleries and creative storefront culture.",
    },
    weak: {
      name: "Peripheral office corridor",
      start: { lat: 41.075, lng: 29.01 },
      end: { lat: 41.082, lng: 29.018 },
      tip: "Office blocks — low gallery density.",
    },
  },
];

export function getCorridorComparePair(mood: RouteMood): CorridorComparePair {
  return (
    CORRIDOR_COMPARE_PAIRS.find((pair) => pair.mood === mood) ??
    CORRIDOR_COMPARE_PAIRS[0]
  );
}

export const ISTANBUL_DEMO_ROUTES: Array<{
  name: string;
  mood: RouteMood;
  start: LatLng;
  end: LatLng;
  tip: string;
}> = [
  {
    name: "Sultanahmet → Eminönü",
    mood: "heritage",
    start: { lat: 41.0086, lng: 28.9802 },
    end: { lat: 41.0172, lng: 28.9745 },
    tip: "Ottoman mosques, bazaars, waterfront — not boring.",
  },
  {
    name: "Maçka Park → Bebek",
    mood: "scenic",
    start: { lat: 41.0467, lng: 28.9934 },
    end: { lat: 41.0775, lng: 29.0433 },
    tip: "Tree-lined Bosphorus climb — strong green corridor.",
  },
  {
    name: "Kadıköy Moda → Bahariye",
    mood: "promenade",
    start: { lat: 40.9842, lng: 29.0254 },
    end: { lat: 40.9908, lng: 29.0295 },
    tip: "Café terraces and pedestrian side streets.",
  },
  {
    name: "Karaköy → İstiklal side streets",
    mood: "arts",
    start: { lat: 41.0256, lng: 28.9744 },
    end: { lat: 41.0342, lng: 28.9778 },
    tip: "Galleries, murals, modern storefront culture.",
  },
];

function placeMatchesMood(place: NearbyPlace, mood: RouteMood): boolean {
  const name = place.name.toLowerCase();
  const types = MOOD_PLACE_TYPES[mood];
  if (types.some((type) => place.types.includes(type))) return true;
  return MOOD_KEYWORDS[mood].some((keyword) => name.includes(keyword));
}

function distanceToPolyline(point: LatLng, polyline: LatLng[]): number {
  if (!polyline.length) return Infinity;
  const nearest = closestPointOnPolyline(point, polyline);
  return haversineDistance(point, nearest);
}

/** Find Google Places worth visiting along a route for the selected mood. */
export async function discoverMoodPlacesAlongRoute(
  polyline: LatLng[],
  mood: RouteMood,
  searchPointCount = 10,
): Promise<MoodPlace[]> {
  if (polyline.length === 0) return [];

  const seen = new Map<string, MoodPlace>();
  const types = MOOD_PLACE_TYPES[mood];
  const searchPoints = samplePolylineEvenly(polyline, searchPointCount);

  for (const point of searchPoints) {

    for (const type of types.slice(0, 4)) {
      const batch = await nearbySearchByType(point.lat, point.lng, 120, type);

      for (const place of batch) {
        if (!placeMatchesMood(place, mood)) continue;
        if (seen.has(place.placeId)) continue;

        const dist = distanceToPolyline(
          { lat: place.lat, lng: place.lng },
          polyline,
        );
        if (dist > 150) continue;

        seen.set(place.placeId, {
          placeId: place.placeId,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          types: place.types,
          mood,
          vicinity: place.vicinity,
          distanceToRouteM: Math.round(dist),
        });
      }
    }
  }

  return [...seen.values()].sort(
    (a, b) => a.distanceToRouteM - b.distanceToRouteM,
  );
}

export function placesMoodScore(pois: MoodPlace[], mood: RouteMood): number {
  const matching = pois.filter((p) => p.mood === mood).length;
  return Math.min(100, matching * 12 + (matching > 0 ? 20 : 0));
}

export function combinedRouteScore(
  streetAverage: number,
  placesScore: number,
): number {
  return Math.round(streetAverage * 0.55 + placesScore * 0.45);
}

export function nearestMoodPlace(
  point: LatLng,
  pois: MoodPlace[],
  maxM = 100,
): MoodPlace | null {
  let best: MoodPlace | null = null;
  let bestDist = maxM;
  for (const poi of pois) {
    const d = haversineDistance(point, { lat: poi.lat, lng: poi.lng });
    if (d < bestDist) {
      bestDist = d;
      best = poi;
    }
  }
  return best;
}
