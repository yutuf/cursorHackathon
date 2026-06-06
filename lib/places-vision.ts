import { analyzeStorefrontQuick } from "@/lib/huggingface";
import { fetchPlacePhoto } from "@/lib/google-maps";
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
    kvkkMasked: true,
  };
}

/** Run HF ViT on Google Places photos for the top POIs along a corridor. */
export async function enrichPoisWithPhotoVision(
  pois: MoodPlace[],
  mood: RouteMood,
  limit = 3,
): Promise<EnrichedMoodPlace[]> {
  const targets = pois.slice(0, limit);
  const enriched: EnrichedMoodPlace[] = [];

  for (const poi of targets) {
    enriched.push(poi);
  }

  for (let index = 0; index < targets.length; index += 1) {
    const poi = targets[index] as MoodPlace & { photoReference?: string };
    if (!poi.photoReference) continue;

    try {
      enriched[index] = await enrichFromNearby(poi, poi.photoReference, mood);
    } catch {
      enriched[index] = poi;
    }
  }

  return [...enriched, ...pois.slice(limit)];
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
