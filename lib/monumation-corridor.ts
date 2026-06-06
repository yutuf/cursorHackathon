import { fetchGoogleDirections } from "@/lib/google-maps";
import { corridorVerdict, type RouteMood } from "@/lib/monumation";
import { combinedRouteScore, placesMoodScore } from "@/lib/places-mood";
import {
  buildPoiPhotoHighlights,
  corridorPhotoMoodScore,
  discoverPhotoBackedMoodPlaces,
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
  const photoPlaces = await discoverPhotoBackedMoodPlaces(
    route.coordinates,
    mood,
    8,
    16,
  );
  const placesScore = placesMoodScore(photoPlaces, mood, route.distanceM);

  const enriched = await buildPoiPhotoHighlights(
    photoPlaces,
    mood,
    photoPoiLimit,
    6,
  );
  const photoVisionAverage = corridorPhotoMoodScore(enriched);
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
      placesFound: photoPlaces.length,
      placesMoodScore: placesScore,
      photoVisionAverage,
      combinedScore,
      corridorVerdict: corridorVerdict(
        photoVisionAverage || visionSignal,
        placesScore,
        photoPlaces.length,
        mood,
      ),
    },
  };
}

export type ComparePathRole = "mood" | "blind";

/**
 * Compare-only scoring: mood corridor vs blind functional path.
 * Scan uses blendCorridorScores; duel uses this so jury sees a clear gap.
 */
export function scoreCompareCorridor(
  result: CorridorScoreResult,
  role: ComparePathRole,
): number {
  const { placesFound, placesMoodScore, photoVisionAverage } = result.summary;
  const photoPeak = corridorPhotoMoodScore(result.pois);
  const km = Math.max(0.4, result.distanceM / 1000);

  if (role === "blind") {
    const functional = Math.round(
      photoPeak * 0.2 +
        placesMoodScore * 0.2 +
        Math.min(10, placesFound * 3),
    );
    return Math.max(8, Math.min(38, functional));
  }

  const breadthPts = Math.min(35, placesFound * 5);
  const registryPts = Math.round(placesMoodScore * 0.45);
  const photoPts = Math.round(Math.max(photoPeak, photoVisionAverage) * 0.55);
  const destinationPts = Math.min(20, Math.round((placesFound / km) * 4));
  const qualityBonus =
    photoPeak >= 12 && placesFound >= 4
      ? 12
      : photoPeak >= 8 && placesFound >= 3
        ? 6
        : 0;

  const raw =
    breadthPts + registryPts + photoPts + destinationPts + qualityBonus;
  return Math.max(42, Math.min(92, raw));
}

export function applyCompareScore(
  result: CorridorScoreResult,
  role: ComparePathRole,
): CorridorScoreResult {
  return {
    ...result,
    summary: {
      ...result.summary,
      combinedScore: scoreCompareCorridor(result, role),
    },
  };
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
