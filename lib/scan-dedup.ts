import type { DetectionResult } from "@/lib/bulan";

type ScanResultLike = {
  index: number;
  detection: DetectionResult | null;
};

function normalizePlaceKey(detection: DetectionResult): string | null {
  if (detection.placesPlaceId) return `id:${detection.placesPlaceId}`;
  if (detection.placesName && detection.placesVerified) {
    return `name:${detection.placesName.toLowerCase().trim()}`;
  }
  return null;
}

/** Collapse repeated detections of the same Google Place along a corridor. */
export function markDuplicateScanResults<T extends ScanResultLike>(
  results: T[],
): T[] {
  const seen = new Map<string, number>();

  return results.map((result) => {
    if (!result.detection) return result;

    const key = normalizePlaceKey(result.detection);
    if (!key) return result;

    const countable =
      result.detection.objectType === "competitor" ||
      result.detection.objectType === "shop";

    if (!countable) return result;

    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      return {
        ...result,
        detection: {
          ...result.detection,
          objectType: "unknown",
          confidence: 0.5,
          duplicateOf: firstIndex,
          caption: `Same business as point ${firstIndex + 1} (${result.detection.placesName ?? "verified place"}) — not counted again`,
          placesVerified: result.detection.placesVerified,
        },
      };
    }

    seen.set(key, result.index);
    return result;
  });
}

/** Unique competitors/shops for summary stats (one count per place). */
export function deduplicateDetectionsForSummary(
  detections: DetectionResult[],
): DetectionResult[] {
  const seen = new Set<string>();

  return detections.filter((detection) => {
    if (detection.duplicateOf !== undefined) return false;

    const key = normalizePlaceKey(detection);
    if (!key) return true;

    if (
      detection.objectType !== "competitor" &&
      detection.objectType !== "shop"
    ) {
      return true;
    }

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
