import { NextRequest, NextResponse } from "next/server";
import {
  classifyFromCaption,
  summarizeOpportunities,
  type BusinessCategory,
  type DetectionResult,
} from "@/lib/bulan";
import { captionStreetViewImage } from "@/lib/huggingface";
import type { StorefrontSide } from "@/lib/route";
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

const MAX_WAYPOINTS = 25;
const VALID_CATEGORIES: BusinessCategory[] = [
  "coffee_shop",
  "electrician",
  "restaurant",
  "retail",
  "barber",
  "pharmacy",
  "grocery",
];

async function fetchStorefrontImage(
  captureLat: number,
  captureLng: number,
  heading: number,
): Promise<{ imageBase64: string | null; metadata: StreetViewMetadata | null; status: string }> {
  const metadata = await fetchStreetViewMetadata(captureLat, captureLng);
  if (metadata.status !== "OK") {
    return { imageBase64: null, metadata, status: metadata.status };
  }

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

  if (!imageResponse.ok) {
    return { imageBase64: null, metadata, status: "ZERO_RESULTS" };
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  return {
    imageBase64: `data:${imageResponse.headers.get("content-type") ?? "image/jpeg"};base64,${buffer.toString("base64")}`,
    metadata,
    status: "OK",
  };
}

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

  for (const [index, waypoint] of waypoints.entries()) {
    const lat = Number(waypoint.lat);
    const lng = Number(waypoint.lng);
    const captureLat = Number(waypoint.captureLat ?? lat);
    const captureLng = Number(waypoint.captureLng ?? lng);
    const heading = Number(waypoint.heading ?? 0);
    const routeHeading = Number(waypoint.routeHeading ?? heading);
    const side = waypoint.side ?? (index % 2 === 0 ? "right" : "left");
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

    try {
      if (includeImages) {
        const capture = await fetchStorefrontImage(captureLat, captureLng, heading);
        metadata = capture.metadata;
        imageBase64 = capture.imageBase64;
        status = capture.status;

        if (imageBase64) {
          const caption = await captionStreetViewImage(imageBase64);
          if (caption) {
            detection = classifyFromCaption(caption, businessCategory);
          } else if (!hasHfKey) {
            detection = {
              objectType: "unknown",
              businessCategory,
              confidence: 0.2,
              caption:
                "Add HUGGINGFACE_API_KEY to .env.local and Vercel for AI classification",
            };
          } else {
            detection = {
              objectType: "unknown",
              businessCategory,
              confidence: 0.2,
              caption: "AI caption failed — Hugging Face model may be loading, retry shortly",
            };
          }
        }
      } else {
        metadata = await fetchStreetViewMetadata(captureLat, captureLng);
        status = metadata.status;
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

  const available = results.filter((result) => result.status === "OK").length;
  const detections = results
    .map((result) => result.detection)
    .filter((value): value is DetectionResult => value !== null);
  const opportunities = summarizeOpportunities(detections);

  return NextResponse.json({
    results,
    businessCategory,
    summary: {
      total: results.length,
      available,
      unavailable: results.length - available,
      apiCallsUsed: results.length + (includeImages ? available : 0),
      opportunities,
      aiEnabled: hasHfKey,
      captureMode: "storefront_perpendicular",
    },
  });
}
