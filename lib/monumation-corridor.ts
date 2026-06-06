import { fetchGoogleDirections } from "@/lib/google-maps";
import { corridorVerdict, type RouteMood } from "@/lib/monumation";
import {
  combinedRouteScore,
  discoverMoodPlacesAlongRoute,
  placesMoodScore,
  type MoodPlace,
} from "@/lib/places-mood";
import {
  averagePhotoMoodScore,
  enrichPoisWithPhotoVision,
  type EnrichedMoodPlace,
} from "@/lib/places-vision";
import type { LatLng } from "@/lib/route";

export type CorridorScoreResult = {
  name: string;
  start: LatLng;
  end: LatLng;
  coordinates: LatLng[];
  distanceM: number;
  durationS: number;
  pois: EnrichedMoodPlace[];
  summary: {
    placesFound: number;
    placesMoodScore: number;
    photoVisionAverage: number;
    combinedScore: number;
    corridorVerdict: string;
  };
};

export async function scoreCorridorFast(
  name: string,
  start: LatLng,
  end: LatLng,
  mood: RouteMood,
  photoPoiLimit = 3,
): Promise<CorridorScoreResult> {
  const route = await fetchGoogleDirections(start, end, [], "walking");
  const pois = await discoverMoodPlacesAlongRoute(route.coordinates, mood, 8);
  const placesScore = placesMoodScore(pois, mood);

  const enriched = await enrichPoisWithPhotoVision(
    await attachPhotoRefsFromDetails(pois),
    mood,
    photoPoiLimit,
  );
  const photoVisionAverage = averagePhotoMoodScore(enriched, mood);
  const visionSignal = photoVisionAverage > 0 ? photoVisionAverage : placesScore * 0.45;
  const combinedScore = combinedRouteScore(visionSignal, placesScore);

  return {
    name,
    start,
    end,
    coordinates: route.coordinates,
    distanceM: route.distanceM,
    durationS: route.durationS,
    pois: enriched,
    summary: {
      placesFound: pois.length,
      placesMoodScore: placesScore,
      photoVisionAverage,
      combinedScore,
      corridorVerdict: corridorVerdict(
        photoVisionAverage || visionSignal,
        placesScore,
        pois.length,
        mood,
      ),
    },
  };
}

async function attachPhotoRefsFromDetails(
  pois: MoodPlace[],
): Promise<Array<MoodPlace & { photoReference?: string }>> {
  const { fetchPlacePhotoReference } = await import("@/lib/google-maps");
  const enriched: Array<MoodPlace & { photoReference?: string }> = [];

  for (const poi of pois.slice(0, 5)) {
    const photoReference = await fetchPlacePhotoReference(poi.placeId);
    enriched.push({ ...poi, photoReference });
  }

  return [...enriched, ...pois.slice(5)];
}

export function blendCorridorScores(
  streetAverage: number,
  placesScore: number,
  photoAverage: number,
): number {
  if (photoAverage > 0 && streetAverage > 0) {
    return Math.round(
      streetAverage * 0.35 + placesScore * 0.35 + photoAverage * 0.3,
    );
  }
  if (photoAverage > 0) {
    return combinedRouteScore(photoAverage, placesScore);
  }
  return combinedRouteScore(streetAverage, placesScore);
}
