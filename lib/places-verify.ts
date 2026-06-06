import type { BusinessCategory, DetectionResult } from "@/lib/bulan";
import {
  fetchNearbyPlaces,
  filterPlacesInCameraView,
  findBestPlaceForCategory,
  matchPlaceToCategory,
  type NearbyPlace,
} from "@/lib/google-maps";
import { offsetByMeters, type LatLng } from "@/lib/route";

const PRESERVE_TYPES = new Set<DetectionResult["objectType"]>([
  "for_rent",
  "for_sale",
  "vacant",
]);

export async function verifyDetectionWithPlaces(
  detection: DetectionResult,
  camera: LatLng,
  cameraHeading: number,
  businessCategory: BusinessCategory,
): Promise<DetectionResult> {
  if (PRESERVE_TYPES.has(detection.objectType)) {
    return detection;
  }

  const queryPoint = offsetByMeters(camera, cameraHeading, 10);
  const nearby = await fetchNearbyPlaces(
    queryPoint.lat,
    queryPoint.lng,
    22,
    cameraHeading,
  );

  const inView = filterPlacesInCameraView(nearby, cameraHeading, 22, 42);
  if (!inView.length) {
    return withoutFalseCompetitor(detection);
  }

  const categoryMatch = findBestPlaceForCategory(inView, businessCategory);
  const place = categoryMatch ?? inView[0];
  const resolvedCategory = matchPlaceToCategory(place);

  return applyPlacesVerification(
    detection,
    place,
    resolvedCategory,
    businessCategory,
  );
}

function withoutFalseCompetitor(detection: DetectionResult): DetectionResult {
  if (detection.objectType === "competitor" && !detection.placesVerified) {
    return {
      ...detection,
      objectType: "unknown",
      confidence: 0.35,
      caption:
        "No business confirmed in this camera view — ImageNet labels are not trusted alone",
      placesName: undefined,
      placesVerified: false,
    };
  }

  return {
    ...detection,
    placesName: undefined,
    placesVerified: false,
  };
}

export function applyPlacesVerification(
  detection: DetectionResult,
  place: NearbyPlace,
  resolvedCategory: BusinessCategory | null,
  targetCategory: BusinessCategory,
): DetectionResult {
  const base = {
    placesName: place.name,
    placesPlaceId: place.placeId,
    placesTypes: place.types,
    placesVerified: true,
    signText: place.name,
  };

  if (resolvedCategory === targetCategory) {
    return {
      ...detection,
      ...base,
      objectType: "competitor",
      businessCategory: resolvedCategory,
      confidence: 0.94,
      caption: `Google Places verified in camera view: ${place.name} (${Math.round(place.distanceM)}m)`,
    };
  }

  if (resolvedCategory) {
    return {
      ...detection,
      ...base,
      objectType: "shop",
      businessCategory: resolvedCategory,
      confidence: 0.9,
      caption: `In view: ${place.name} is a ${resolvedCategory.replace("_", " ")}, not ${targetCategory.replace("_", " ")}`,
    };
  }

  return {
    ...detection,
    ...base,
    objectType: "shop",
    confidence: 0.82,
    caption: `In view: ${place.name} (${Math.round(place.distanceM)}m) — category not mapped`,
  };
}
