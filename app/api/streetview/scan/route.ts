import { NextRequest, NextResponse } from "next/server";
import {
  buildStreetViewUrl,
  fetchStreetViewMetadata,
  getApiKey,
  type StreetViewMetadata,
} from "@/lib/streetview";

type ScanWaypoint = {
  lat: number;
  lng: number;
  heading?: number;
  distanceM?: number;
};

type ScanRequestBody = {
  waypoints?: ScanWaypoint[];
  includeImages?: boolean;
};

export type ScanResult = {
  index: number;
  lat: number;
  lng: number;
  heading: number;
  distanceM: number;
  status: string;
  metadata: StreetViewMetadata | null;
  imageBase64: string | null;
};

const MAX_WAYPOINTS = 25;

export async function POST(request: NextRequest) {
  let body: ScanRequestBody;

  try {
    body = (await request.json()) as ScanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const waypoints = body.waypoints ?? [];

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
  const results: ScanResult[] = [];

  for (const [index, waypoint] of waypoints.entries()) {
    const lat = Number(waypoint.lat);
    const lng = Number(waypoint.lng);
    const heading = Number(waypoint.heading ?? 0);
    const distanceM = Number(waypoint.distanceM ?? 0);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: `Invalid coordinates at waypoint ${index + 1}.` },
        { status: 400 },
      );
    }

    let metadata: StreetViewMetadata | null = null;
    let imageBase64: string | null = null;
    let status = "ERROR";

    try {
      metadata = await fetchStreetViewMetadata(lat, lng);
      status = metadata.status;

      if (includeImages && metadata.status === "OK") {
        const imageResponse = await fetch(
          buildStreetViewUrl(
            {
              lat,
              lng,
              heading,
              pitch: 0,
              fov: 90,
              width: 480,
              height: 320,
            },
            getApiKey(),
          ),
        );

        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          imageBase64 = `data:${imageResponse.headers.get("content-type") ?? "image/jpeg"};base64,${buffer.toString("base64")}`;
        }
      }
    } catch {
      status = "ERROR";
    }

    results.push({
      index,
      lat,
      lng,
      heading,
      distanceM,
      status,
      metadata,
      imageBase64,
    });
  }

  const available = results.filter((result) => result.status === "OK").length;

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      available,
      unavailable: results.length - available,
      apiCallsUsed: results.length + (includeImages ? available : 0),
    },
  });
}
