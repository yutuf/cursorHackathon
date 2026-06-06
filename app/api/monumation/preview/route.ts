import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleDirections } from "@/lib/google-maps";
import { validateWalkableRoute } from "@/lib/route-restrictions";
import { haversineDistance, type LatLng } from "@/lib/route";

type PreviewBody = {
  start?: LatLng;
  end?: LatLng;
};

function isValidPoint(point: LatLng | undefined): point is LatLng {
  return (
    !!point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

export async function POST(request: NextRequest) {
  let body: PreviewBody;

  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidPoint(body.start) || !isValidPoint(body.end)) {
    return NextResponse.json(
      { error: "Provide valid start and end points." },
      { status: 400 },
    );
  }

  try {
    const validation = await validateWalkableRoute(body.start, body.end);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, reason: validation.reason },
        { status: 400 },
      );
    }

    const route = await fetchGoogleDirections(
      body.start,
      body.end,
      [],
      "walking",
    );
    const straightM = Math.round(haversineDistance(body.start, body.end));
    const detourRatio =
      straightM > 0
        ? Math.round((route.distanceM / straightM) * 100) / 100
        : 1;

    return NextResponse.json({
      ok: true,
      start: body.start,
      end: body.end,
      coordinates: route.coordinates,
      distanceM: route.distanceM,
      durationS: route.durationS,
      straightM,
      detourRatio,
      pathPoints: route.coordinates.length,
      roadNames: route.roadNames.slice(0, 4),
      estimatedSamplePoints: Math.min(
        10,
        Math.max(3, Math.round(route.distanceM / 60)),
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Route preview failed";
    return NextResponse.json({ ok: false, reason: message }, { status: 502 });
  }
}
