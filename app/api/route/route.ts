import { NextRequest, NextResponse } from "next/server";
import {
  fetchDrivingRoute,
  sampleRouteWaypoints,
  type LatLng,
} from "@/lib/route";

type RouteRequestBody = {
  start?: LatLng;
  end?: LatLng;
  sampleIntervalM?: number;
  maxPoints?: number;
};

function parsePoint(point: LatLng | undefined, label: string): LatLng | { error: string } {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return { error: `Missing or invalid ${label} point.` };
  }

  if (point.lat < -90 || point.lat > 90) {
    return { error: `${label} latitude must be between -90 and 90.` };
  }

  if (point.lng < -180 || point.lng > 180) {
    return { error: `${label} longitude must be between -180 and 180.` };
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

  const start = parsePoint(body.start, "start");
  if ("error" in start) {
    return NextResponse.json({ error: start.error }, { status: 400 });
  }

  const end = parsePoint(body.end, "end");
  if ("error" in end) {
    return NextResponse.json({ error: end.error }, { status: 400 });
  }

  const sampleIntervalM = Math.min(
    500,
    Math.max(30, Number(body.sampleIntervalM ?? 80)),
  );
  const maxPoints = Math.min(15, Math.max(2, Number(body.maxPoints ?? 15)));

  try {
    const route = await fetchDrivingRoute(start, end);
    const waypoints = sampleRouteWaypoints(
      route.coordinates,
      sampleIntervalM,
      maxPoints,
    );

    return NextResponse.json({
      ...route,
      waypoints,
      sampleIntervalM,
      estimatedApiCalls: waypoints.length * 2,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to calculate route";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
