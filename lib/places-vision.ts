import { analyzeStorefrontQuick } from "@/lib/huggingface";
import { fetchPlacePhoto, fetchPlacePhotoReference } from "@/lib/google-maps";
import { applyKvkkPipelineGate } from "@/lib/kvkk";
import {
  normalizeViaGoEngine,
  type GoNormalizeResult,
} from "@/lib/monumation-engine";
import {
  scoreForMood,
  scoreMonumationNode,
  type RouteMood,
} from "@/lib/monumation";
import type { MoodPlace } from "@/lib/places-mood";
import type { LatLng } from "@/lib/route";

export type EnrichedMoodPlace = MoodPlace & {
  photoUrl?: string;
  photoMoodScore?: number;
  photoDominantTag?: string;
  photoLabels?: string[];
  scoringEngine?: "monumation-go" | "nextjs";
  kvkkMasked?: boolean;
};

function moodScoreFromGo(go: GoNormalizeResult, mood: RouteMood): number {
  switch (mood) {
    case "heritage":
      return Math.round(go.heritage_score);
    case "scenic":
      return Math.round(go.scenic_score);
    case "arts":
      return Math.round(go.art_score);
    case "promenade":
      return Math.round(go.promenade_score);
  }
}

export async function classifyPlacePhoto(
  photoBase64: string,
  mood: RouteMood,
): Promise<{
  moodScore: number;
  dominantTag: string;
  labels: string[];
  scoringEngine: "monumation-go" | "nextjs";
}> {
  applyKvkkPipelineGate(photoBase64);
  const analysis = await analyzeStorefrontQuick(photoBase64);
  if (!analysis) {
    return {
      moodScore: 0,
      dominantTag: "No vision signal",
      labels: [],
      scoringEngine: "nextjs",
    };
  }

  const labels = analysis.labelScores.map((item) => item.label);
  const go = await normalizeViaGoEngine(labels, analysis.detrLabels);
  if (go) {
    return {
      moodScore: moodScoreFromGo(go, mood),
      dominantTag: go.dominant_mood_tag,
      labels: labels.slice(0, 5),
      scoringEngine: "monumation-go",
    };
  }

  const labelWeights = analysis.labelScores.map((item) => ({
    label: item.label,
    weight: item.score,
  }));
  const node = scoreMonumationNode(0, 0, [], {
    labelWeights,
    detrLabels: analysis.detrLabels,
  });

  return {
    moodScore: scoreForMood(node, mood),
    dominantTag: node.dominant_mood_tag,
    labels: labelWeights.slice(0, 5).map((item) => item.label),
    scoringEngine: "nextjs",
  };
}

async function enrichFromNearby(
  place: MoodPlace,
  photoReference: string | undefined,
  mood: RouteMood,
): Promise<EnrichedMoodPlace> {
  if (!photoReference) return place;

  const photo = await fetchPlacePhoto(photoReference, 480);
  if (!photo) return place;

  const vision = await classifyPlacePhoto(photo.base64, mood);
  return {
    ...place,
    photoUrl: photo.base64,
    photoMoodScore: vision.moodScore,
    photoDominantTag: vision.dominantTag,
    photoLabels: vision.labels,
    scoringEngine: vision.scoringEngine,
  };
}

/** Attach Google photo refs — reuse nearby-search refs before hitting Place Details. */
export async function attachPhotoReferences(
  pois: MoodPlace[],
  maxDetailLookups = 18,
): Promise<Array<MoodPlace & { photoReference?: string }>> {
  const result: Array<MoodPlace & { photoReference?: string }> = [];
  let detailFetches = 0;

  for (const poi of pois) {
    if (poi.photoReference) {
      result.push(poi);
      continue;
    }
    if (detailFetches < maxDetailLookups) {
      const photoReference = await fetchPlacePhotoReference(poi.placeId);
      detailFetches += 1;
      result.push({ ...poi, photoReference });
      continue;
    }
    result.push(poi);
  }

  return result;
}

/** Mood places that actually have a Google photo (nearby ref or Place Details). */
export async function discoverPhotoBackedMoodPlaces(
  polyline: LatLng[],
  mood: RouteMood,
  searchPointCount = 10,
  maxDetailLookups = 24,
): Promise<Array<MoodPlace & { photoReference?: string }>> {
  const { discoverMoodPlacesAlongRoute } = await import("@/lib/places-mood");
  const discovered = await discoverMoodPlacesAlongRoute(
    polyline,
    mood,
    searchPointCount,
  );
  const withRefs = await attachPhotoReferences(discovered, maxDetailLookups);
  return withRefs.filter((poi) => Boolean(poi.photoReference));
}

/** ViT on up to `maxHighlights` POIs that actually have Google photos. */
export async function buildPoiPhotoHighlights(
  pois: MoodPlace[],
  mood: RouteMood,
  maxHighlights = 4,
  maxDetailLookups = 18,
): Promise<EnrichedMoodPlace[]> {
  const withRefs = await attachPhotoReferences(pois, maxDetailLookups);
  const candidates = withRefs.filter((poi) => poi.photoReference);
  const highlights: EnrichedMoodPlace[] = [];

  for (const poi of candidates) {
    if (highlights.length >= maxHighlights) break;
    try {
      const enriched = await enrichFromNearby(poi, poi.photoReference, mood);
      if (enriched.photoUrl) highlights.push(enriched);
    } catch {
      // skip failed photo fetch / vision
    }
  }

  return highlights;
}

/** @deprecated Use buildPoiPhotoHighlights — returns only POIs with photos. */
export async function enrichPoisWithPhotoVision(
  pois: MoodPlace[],
  mood: RouteMood,
  limit = 3,
): Promise<EnrichedMoodPlace[]> {
  return buildPoiPhotoHighlights(pois, mood, limit, limit + 8);
}

export function averagePhotoMoodScore(
  pois: EnrichedMoodPlace[],
  mood: RouteMood,
): number {
  const scored = pois.filter((poi) => poi.photoMoodScore !== undefined);
  if (!scored.length) return 0;
  const sum = scored.reduce((acc, poi) => acc + (poi.photoMoodScore ?? 0), 0);
  return Math.round(sum / scored.length);
}
