import { NextRequest, NextResponse } from "next/server";
import {
  assessAreaForStorefrontScan,
  boundsRing,
  measureBounds,
  normalizeBounds,
  type AreaBounds,
} from "@/lib/area";
import {
  fetchAreaRoadNetwork,
  fetchGoogleDirections,
} from "@/lib/google-maps";
import {
  assessRouteForStorefrontScan,
  sampleRouteWaypoints,
  type LatLng,
} from "@/lib/route";

type RouteRequestBody = {
  bounds?: AreaBounds;
  cornerA?: LatLng;
  cornerB?: LatLng;
  start?: LatLng;
  end?: LatLng;
  sampleIntervalM?: number;
  maxPoints?: number;
};

function parseBounds(body: RouteRequestBody): AreaBounds | { error: string } {
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

function parsePoint(point: LatLng | undefined, label: string): LatLng | { error: string } {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return { error: `Missing or invalid ${label} point.` };
  }
  return point;
}

export async function POST(request: NextRequest) {
  let body: RouteRequestBody;

  try {
    body = (await request.json()) as RouteRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sampleIntervalM = Math.min(
    500,
    Math.max(20, Number(body.sampleIntervalM ?? 20)),
  );
  const maxPoints = Math.min(15, Math.max(2, Number(body.maxPoints ?? 15)));

  try {
    if (body.start && body.end) {
      const start = parsePoint(body.start, "start");
      if ("error" in start) {
        return NextResponse.json({ error: start.error }, { status: 400 });
      }

      const end = parsePoint(body.end, "end");
      if ("error" in end) {
        return NextResponse.json({ error: end.error }, { status: 400 });
      }

      const route = await fetchGoogleDirections(start, end);
      const waypoints = sampleRouteWaypoints(
        route.coordinates,
        sampleIntervalM,
        maxPoints,
      );
      const scanWarning = assessRouteForStorefrontScan(route, start, end);

      return NextResponse.json({
        mode: "directions",
        start,
        end,
        ...route,
        waypoints,
        sampleIntervalM,
        estimatedApiCalls: waypoints.length * 2,
        scanWarning,
        geometrySource: "google_directions",
      });
    }

    const bounds = parseBounds(body);
    if ("error" in bounds) {
      return NextResponse.json({ error: bounds.error }, { status: 400 });
    }

    const dimensions = measureBounds(bounds);
    const route = await fetchAreaRoadNetwork(bounds);
    const waypoints = sampleRouteWaypoints(
      route.coordinates,
      sampleIntervalM,
      maxPoints,
    );
    const scanWarning =
      assessAreaForStorefrontScan(bounds) ??
      assessRouteForStorefrontScan(
        route,
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east },
      );

    return NextResponse.json({
      mode: "area",
      bounds,
      ...dimensions,
      coordinates: route.coordinates,
      boundsOutline: boundsRing(bounds),
      distanceM: route.distanceM,
      durationS: route.durationS,
      roadNames: route.roadNames,
      waypoints,
      sampleIntervalM,
      estimatedApiCalls: waypoints.length * 2,
      scanWarning,
      geometrySource: "google_directions",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to calculate route";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
