import { NextRequest, NextResponse } from "next/server";
import {
  classifyStorefront,
  summarizeOpportunities,
  type BusinessCategory,
  type DetectionResult,
} from "@/lib/bulan";
import {
  analyzeStorefrontImage,
  analyzeStorefrontQuick,
  scoreCaptureQuality,
  type QuickStorefrontAnalysis,
} from "@/lib/huggingface";
import type { StorefrontSide } from "@/lib/route";
import { markDuplicateScanResults } from "@/lib/scan-dedup";
import { verifyDetectionWithPlaces } from "@/lib/places-verify";
import {
  buildStreetViewUrl,
  fetchStreetViewMetadata,
  getApiKey,
  STOREFRONT_CAPTURE,
  type StreetViewMetadata,
} from "@/lib/streetview";

type ScanWaypoint = {
  lat: number;
  lng: number;
  captureLat?: number;
  captureLng?: number;
  heading?: number;
  routeHeading?: number;
  side?: StorefrontSide;
  distanceM?: number;
};

type ScanRequestBody = {
  waypoints?: ScanWaypoint[];
  includeImages?: boolean;
  businessCategory?: BusinessCategory;
};

export type ScanResult = {
  index: number;
  lat: number;
  lng: number;
  captureLat: number;
  captureLng: number;
  heading: number;
  routeHeading: number;
  side: StorefrontSide;
  distanceM: number;
  status: string;
  metadata: StreetViewMetadata | null;
  imageBase64: string | null;
  detection: DetectionResult | null;
};

const MAX_WAYPOINTS = 12;
const VALID_CATEGORIES: BusinessCategory[] = [
  "coffee_shop",
  "electrician",
  "restaurant",
  "retail",
  "barber",
  "pharmacy",
  "grocery",
];

type CaptureCandidate = {
  imageBase64: string;
  metadata: StreetViewMetadata;
  heading: number;
  side: StorefrontSide;
  captureLat: number;
  captureLng: number;
  qualityScore: number;
  quickAnalysis: QuickStorefrontAnalysis | null;
};

async function fetchStorefrontCandidate(
  captureLat: number,
  captureLng: number,
  heading: number,
  side: StorefrontSide,
): Promise<CaptureCandidate | null> {
  const metadata = await fetchStreetViewMetadata(captureLat, captureLng);
  if (metadata.status !== "OK") return null;

  const imageResponse = await fetch(
    buildStreetViewUrl(
      {
        lat: captureLat,
        lng: captureLng,
        heading,
        pitch: STOREFRONT_CAPTURE.pitch,
        fov: STOREFRONT_CAPTURE.fov,
        width: STOREFRONT_CAPTURE.width,
        height: STOREFRONT_CAPTURE.height,
      },
      getApiKey(),
    ),
  );

  if (!imageResponse.ok) return null;

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const imageBase64 = `data:${imageResponse.headers.get("content-type") ?? "image/jpeg"};base64,${buffer.toString("base64")}`;

  const quickAnalysis = await analyzeStorefrontQuick(imageBase64);
  const qualityScore = quickAnalysis ? scoreCaptureQuality(quickAnalysis) : 0;

  return {
    imageBase64,
    metadata,
    heading,
    side,
    captureLat,
    captureLng,
    qualityScore,
    quickAnalysis,
  };
}

async function captureBestStorefront(
  lat: number,
  lng: number,
  routeHeading: number,
  preferredSide: StorefrontSide,
): Promise<CaptureCandidate | null> {
  const rightHeading = (routeHeading + 90) % 360;
  const leftHeading = (routeHeading + 270) % 360;

  const attempts: Array<{ heading: number; side: StorefrontSide }> =
    preferredSide === "right"
      ? [
          { heading: rightHeading, side: "right" },
          { heading: leftHeading, side: "left" },
        ]
      : [
          { heading: leftHeading, side: "left" },
          { heading: rightHeading, side: "right" },
        ];

  let best: CaptureCandidate | null = null;

  for (const attempt of attempts) {
    const candidate = await fetchStorefrontCandidate(
      lat,
      lng,
      attempt.heading,
      attempt.side,
    );
    if (!candidate) continue;
    if (!best || candidate.qualityScore > best.qualityScore) {
      best = candidate;
    }
    if (candidate.qualityScore >= 70) break;
  }

  return best;
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: ScanRequestBody;

  try {
    body = (await request.json()) as ScanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const waypoints = body.waypoints ?? [];
  const businessCategory = VALID_CATEGORIES.includes(
    body.businessCategory as BusinessCategory,
  )
    ? (body.businessCategory as BusinessCategory)
    : "coffee_shop";

  if (waypoints.length === 0) {
    return NextResponse.json({ error: "No waypoints provided." }, { status: 400 });
  }

  if (waypoints.length > MAX_WAYPOINTS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_WAYPOINTS} waypoints per scan.` },
      { status: 400 },
    );
  }

  const includeImages = body.includeImages ?? true;
  const hasHfKey = Boolean(process.env.HUGGINGFACE_API_KEY);
  const results: ScanResult[] = [];
  let streetViewCalls = 0;

  for (const [index, waypoint] of waypoints.entries()) {
    const lat = Number(waypoint.lat);
    const lng = Number(waypoint.lng);
    const routeHeading = Number(waypoint.routeHeading ?? waypoint.heading ?? 0);
    const preferredSide =
      waypoint.side ?? (index % 2 === 0 ? "right" : "left");
    const distanceM = Number(waypoint.distanceM ?? 0);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: `Invalid coordinates at waypoint ${index + 1}.` },
        { status: 400 },
      );
    }

    let metadata: StreetViewMetadata | null = null;
    let imageBase64: string | null = null;
    let detection: DetectionResult | null = null;
    let status = "ERROR";
    let heading = Number(waypoint.heading ?? 0);
    let side = preferredSide;
    let captureLat = lat;
    let captureLng = lng;

    try {
      if (includeImages) {
        const capture = await captureBestStorefront(
          lat,
          lng,
          routeHeading,
          preferredSide,
        );
        streetViewCalls += capture ? 2 : 1;

        if (capture) {
          metadata = capture.metadata;
          imageBase64 = capture.imageBase64;
          heading = capture.heading;
          side = capture.side;
          captureLat = capture.captureLat;
          captureLng = capture.captureLng;
          status = "OK";

          const analysis = capture.quickAnalysis
            ? await analyzeStorefrontImage(
                capture.imageBase64,
                capture.quickAnalysis,
              )
            : null;

          if (analysis) {
            detection = classifyStorefront({
              caption: analysis.caption,
              labelScores: analysis.labelScores,
              detrLabels: analysis.detrLabels,
              signText: analysis.signText,
              businessCategory,
            });

            const verifyLat = metadata?.location?.lat ?? captureLat;
            const verifyLng = metadata?.location?.lng ?? captureLng;
            detection = await verifyDetectionWithPlaces(
              detection,
              { lat: verifyLat, lng: verifyLng },
              heading,
              businessCategory,
            );
          } else if (!hasHfKey) {
            detection = {
              objectType: "unknown",
              businessCategory,
              confidence: 0.2,
              caption: "Add HUGGINGFACE_API_KEY for AI classification",
            };
          } else {
            detection = {
              objectType: "unknown",
              businessCategory,
              confidence: 0.2,
              caption: "AI analysis failed — check Hugging Face token permissions",
            };
          }
        } else {
          status = "ZERO_RESULTS";
        }
      } else {
        metadata = await fetchStreetViewMetadata(lat, lng);
        status = metadata.status;
        streetViewCalls += 1;
      }
    } catch {
      status = "ERROR";
    }

    results.push({
      index,
      lat,
      lng,
      captureLat,
      captureLng,
      heading,
      routeHeading,
      side,
      distanceM,
      status,
      metadata,
      imageBase64,
      detection,
    });
  }

  const dedupedResults = markDuplicateScanResults(results);
  const available = dedupedResults.filter((result) => result.status === "OK").length;
  const detections = dedupedResults
    .map((result) => result.detection)
    .filter((value): value is DetectionResult => value !== null);
  const opportunities = summarizeOpportunities(detections);

  return NextResponse.json({
    results: dedupedResults,
    businessCategory,
    summary: {
      total: results.length,
      available,
      unavailable: results.length - available,
      apiCallsUsed: streetViewCalls + available,
      opportunities,
      aiEnabled: hasHfKey,
      captureMode: "places_in_view_verified",
    },
  });
}
