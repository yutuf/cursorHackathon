import { NextRequest, NextResponse } from "next/server";
import {
  validateWalkablePoint,
  validateWalkableRoute,
} from "@/lib/route-restrictions";
import type { LatLng } from "@/lib/route";

type ValidateBody = {
  point?: LatLng;
  start?: LatLng;
  end?: LatLng;
};

function isValidPoint(point: LatLng | undefined): point is LatLng {
  if (!point) return false;
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

export async function POST(request: NextRequest) {
  let body: ValidateBody;

  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    if (isValidPoint(body.start) && isValidPoint(body.end)) {
      const result = await validateWalkableRoute(body.start, body.end);
      return NextResponse.json(result);
    }

    if (isValidPoint(body.point)) {
      const result = await validateWalkablePoint(body.point);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide { point } or { start, end }." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ ok: false, reason: message }, { status: 502 });
  }
}
