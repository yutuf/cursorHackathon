import { NextRequest, NextResponse } from "next/server";
import type { BusinessCategory } from "@/lib/bulan";
import {
  assessAreaForStorefrontScan,
  measureBounds,
  normalizeBounds,
  type AreaBounds,
} from "@/lib/area";
import {
  discoverPlacesInBounds,
  summarizeDiscoveredPlaces,
} from "@/lib/places-discovery";
import type { LatLng } from "@/lib/route";

type DiscoverRequestBody = {
  bounds?: AreaBounds;
  cornerA?: LatLng;
  cornerB?: LatLng;
  businessCategory?: BusinessCategory;
};

const VALID_CATEGORIES: BusinessCategory[] = [
  "coffee_shop",
  "electrician",
  "restaurant",
  "retail",
  "barber",
  "pharmacy",
  "grocery",
];

function parseBounds(body: DiscoverRequestBody): AreaBounds | { error: string } {
  if (body.bounds) {
    const { north, south, east, west } = body.bounds;
    if (
      [north, south, east, west].every((value) => Number.isFinite(value)) &&
      north > south &&
      east > west
    ) {
      return body.bounds;
    }
    return { error: "Invalid bounds object." };
  }

  const cornerA = body.cornerA;
  const cornerB = body.cornerB;
  if (
    !cornerA ||
    !cornerB ||
    !Number.isFinite(cornerA.lat) ||
    !Number.isFinite(cornerA.lng) ||
    !Number.isFinite(cornerB.lat) ||
    !Number.isFinite(cornerB.lng)
  ) {
    return { error: "Draw an area on the map (drag a rectangle)." };
  }

  return normalizeBounds(cornerA, cornerB);
}

export async function POST(request: NextRequest) {
  let body: DiscoverRequestBody;

  try {
    body = (await request.json()) as DiscoverRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bounds = parseBounds(body);
  if ("error" in bounds) {
    return NextResponse.json({ error: bounds.error }, { status: 400 });
  }

  const businessCategory = VALID_CATEGORIES.includes(
    body.businessCategory as BusinessCategory,
  )
    ? (body.businessCategory as BusinessCategory)
    : "coffee_shop";

  try {
    const dimensions = measureBounds(bounds);
    const scanWarning = assessAreaForStorefrontScan(bounds);
    const places = await discoverPlacesInBounds(bounds, businessCategory);
    const opportunities = summarizeDiscoveredPlaces(places, businessCategory);

    return NextResponse.json({
      mode: "places_first",
      bounds,
      ...dimensions,
      businessCategory,
      places,
      opportunities,
      scanWarning,
      geometrySource: "google_places",
      estimatedApiCalls: 14,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to discover places";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
