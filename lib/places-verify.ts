import type { BusinessCategory, DetectionResult } from "@/lib/bulan";
import {
  fetchNearbyPlaces,
  findBestPlaceForCategory,
  matchPlaceToCategory,
  type NearbyPlace,
} from "@/lib/google-maps";

const UNRELIABLE_AI_LABELS =
  /tobacco|convenience store|shop|store|market|restaurant|bakery|barbershop/i;

export async function verifyDetectionWithPlaces(
  detection: DetectionResult,
  lat: number,
  lng: number,
  businessCategory: BusinessCategory,
): Promise<DetectionResult> {
  const places = await fetchNearbyPlaces(lat, lng);
  if (!places.length) return detection;

  const nearest = findBestPlaceForCategory(places, businessCategory);
  const anyPlace = places[0];
  const resolvedPlace = nearest ?? anyPlace;
  const resolvedCategory = matchPlaceToCategory(resolvedPlace);

  return applyPlacesVerification(
    detection,
    resolvedPlace,
    resolvedCategory,
    businessCategory,
  );
}

export function applyPlacesVerification(
  detection: DetectionResult,
  place: NearbyPlace,
  resolvedCategory: BusinessCategory | null,
  targetCategory: BusinessCategory,
): DetectionResult {
  const aiLooksUnreliable =
    detection.objectType === "shop" ||
    detection.objectType === "unknown" ||
    UNRELIABLE_AI_LABELS.test(detection.signText ?? "") ||
    UNRELIABLE_AI_LABELS.test(detection.caption ?? "");

  if (resolvedCategory) {
    const isCompetitor = resolvedCategory === targetCategory;
    const shouldOverride =
      aiLooksUnreliable || resolvedCategory !== targetCategory;

    if (shouldOverride || isCompetitor) {
      return {
        ...detection,
        objectType: isCompetitor ? "competitor" : "shop",
        businessCategory: resolvedCategory,
        confidence: 0.96,
        signText: place.name,
        placesName: place.name,
        placesTypes: place.types,
        placesVerified: true,
        caption: isCompetitor
          ? `Google Places verified: ${place.name}`
          : `AI corrected via Google Places: ${place.name} (${resolvedCategory.replace("_", " ")})`,
      };
    }
  }

  if (place.name && aiLooksUnreliable) {
    return {
      ...detection,
      objectType:
        detection.objectType === "unknown" ? "shop" : detection.objectType,
      confidence: Math.max(detection.confidence, 0.75),
      signText: place.name,
      placesName: place.name,
      placesTypes: place.types,
      placesVerified: true,
      caption: `${detection.caption ?? ""}; Nearby: ${place.name}`.trim(),
    };
  }

  return {
    ...detection,
    placesName: place.name,
    placesTypes: place.types,
  };
}
