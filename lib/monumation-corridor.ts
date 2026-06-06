import { fetchGoogleDirections } from "@/lib/google-maps";
import { corridorVerdict, type RouteMood } from "@/lib/monumation";
import { combinedRouteScore, placesMoodScore } from "@/lib/places-mood";
import {
  averagePhotoMoodScore,
  buildPoiPhotoHighlights,
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
  const placesScore = placesMoodScore(photoPlaces, mood);

  const enriched = await buildPoiPhotoHighlights(
    photoPlaces,
    mood,
    photoPoiLimit,
    6,
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
