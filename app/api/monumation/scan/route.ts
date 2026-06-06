import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleDirections } from "@/lib/google-maps";
import { applyKvkkPipelineGate } from "@/lib/kvkk";
import { analyzeStorefrontQuick } from "@/lib/huggingface";
import {
  checkGoEngineHealth,
  goScoreForMood,
  scanViaGoEngine,
} from "@/lib/monumation-engine";
import {
  averageMoodScore,
  capWeakPromenadeFromLabels,
  corridorVerdict,
  poiProximityBoost,
  scoreMonumationNode,
  scoreMoodCapture,
  type MonumationNode,
  type RouteMood,
} from "@/lib/monumation";
import { blendCorridorScores } from "@/lib/monumation-corridor";
import {
  nearestMoodPlace,
  placesMoodScore,
  type MoodPlace,
} from "@/lib/places-mood";
import {
  averagePhotoMoodScore,
  buildPoiPhotoHighlights,
  discoverPhotoBackedMoodPlaces,
} from "@/lib/places-vision";
import {
  validateWalkableEndpoints,
  validateWalkingRouteShape,
} from "@/lib/route-restrictions";
import {
  bearing,
  haversineDistance,
  sampleRouteWaypoints,
  type LatLng,
  type RouteWaypoint,
} from "@/lib/route";
import {
  buildStreetViewUrl,
  fetchStreetViewMetadata,
  getApiKey,
  STOREFRONT_CAPTURE,
} from "@/lib/streetview";

type ScanBody = {
  start?: LatLng;
  end?: LatLng;
  routeMood?: RouteMood;
  maxPoints?: number;
};

const VALID_MOODS: RouteMood[] = ["heritage", "scenic", "arts", "promenade"];
const MAX_POINTS = 10;

export type MonumationScanNode = MonumationNode & {
  index: number;
  distanceM: number;
  heading: number;
  imageBase64: string | null;
  streetViewStatus: string;
  kvkkMasked: boolean;
  nearbyPoi?: string;
  poiDistanceM?: number;
  rawMoodScore?: number;
  poiBoost?: number;
  visionLabels?: string[];
  scoringEngine?: "monumation-go" | "nextjs";
};

type MoodCapture = {
  imageBase64: string;
  heading: number;
  streetViewStatus: string;
  labels: string[];
  labelWeights: Array<{ label: string; weight: number }>;
  detrLabels: string[];
  moodScore: number;
};

async function captureMoodView(
  waypoint: RouteWaypoint,
  heading: number,
): Promise<MoodCapture | null> {
  const metadata = await fetchStreetViewMetadata(
    waypoint.captureLat,
    waypoint.captureLng,
  );
  if (metadata.status !== "OK") {
    return {
      imageBase64: "",
      heading,
      streetViewStatus: metadata.status,
      labels: [],
      labelWeights: [],
      detrLabels: [],
      moodScore: 0,
    };
  }

  const imageResponse = await fetch(
    buildStreetViewUrl(
      {
        lat: waypoint.captureLat,
        lng: waypoint.captureLng,
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
  applyKvkkPipelineGate(imageBase64);
  const analysis = await analyzeStorefrontQuick(imageBase64);
  const labelWeights =
    analysis?.labelScores.map((item) => ({
      label: item.label,
      weight: item.score,
    })) ?? [];
  const labels = labelWeights.map((item) => item.label);
  const detrLabels = analysis?.detrLabels ?? [];

  return {
    imageBase64,
    heading,
    streetViewStatus: metadata.status,
    labels,
    labelWeights,
    detrLabels,
    moodScore: 0,
  };
}

async function captureBestMoodView(
  waypoint: RouteWaypoint,
  routeMood: RouteMood,
  nearPoi: MoodPlace | null,
): Promise<MoodCapture | null> {
  const rightHeading = (waypoint.routeHeading + 90) % 360;
  const leftHeading = (waypoint.routeHeading + 270) % 360;
  const headings = new Set<number>([waypoint.heading, rightHeading, leftHeading]);

  if (nearPoi) {
    headings.add(
      Math.round(
        bearing(
          { lat: waypoint.lat, lng: waypoint.lng },
          { lat: nearPoi.lat, lng: nearPoi.lng },
        ),
      ),
    );
  }

  let best: MoodCapture | null = null;

  for (const heading of headings) {
    const capture = await captureMoodView(waypoint, heading);
    if (!capture || capture.streetViewStatus !== "OK") {
      if (!best && capture) best = capture;
      continue;
    }

    capture.moodScore = scoreMoodCapture(
      {
        labelScores: capture.labelWeights,
        detrLabels: capture.detrLabels,
      },
      routeMood,
    );

    if (!best || capture.moodScore > best.moodScore) {
      best = capture;
    }
    if (capture.moodScore >= 42) break;
  }

  return best;
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: ScanBody;

  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const start = body.start;
  const end = body.end;
  if (
    !start ||
    !end ||
    !Number.isFinite(start.lat) ||
    !Number.isFinite(start.lng) ||
    !Number.isFinite(end.lat) ||
    !Number.isFinite(end.lng)
  ) {
    return NextResponse.json(
      { error: "Provide valid start and end points on the map." },
      { status: 400 },
    );
  }

  const routeMood = VALID_MOODS.includes(body.routeMood as RouteMood)
    ? (body.routeMood as RouteMood)
    : "heritage";
  const maxPoints = Math.min(MAX_POINTS, Math.max(3, body.maxPoints ?? 8));

  try {
    const endpoints = await validateWalkableEndpoints(start, end);
    if (!endpoints.ok) {
      return NextResponse.json({ error: endpoints.reason }, { status: 400 });
    }

    const goHealth = await checkGoEngineHealth();
    let route;
    try {
      route = await fetchGoogleDirections(start, end, [], "walking");
    } catch (directionsError) {
      const message =
        directionsError instanceof Error
          ? directionsError.message
          : "No walking route found.";
      return NextResponse.json(
        {
          error:
            "No walking route between these points — they may be separated by water.",
          detail: message,
        },
        { status: 400 },
      );
    }

    const shape = validateWalkingRouteShape(start, end, route);
    if (!shape.ok) {
      return NextResponse.json({ error: shape.reason }, { status: 400 });
    }
    const waypoints = sampleRouteWaypoints(
      route.coordinates,
      60,
      maxPoints,
    );

    const photoPlaces = await discoverPhotoBackedMoodPlaces(
      route.coordinates,
      routeMood,
    );
    const poiHighlights = await buildPoiPhotoHighlights(
      photoPlaces,
      routeMood,
      4,
      8,
    );
    const placesScore = placesMoodScore(photoPlaces, routeMood);
    const photoVisionAverage = averagePhotoMoodScore(poiHighlights, routeMood);

    const nodes: MonumationScanNode[] = [];

    for (const [index, waypoint] of waypoints.entries()) {
      let imageBase64: string | null = null;
      let streetViewStatus = "SKIPPED";
      let labels: string[] = [];
      let labelWeights: Array<{ label: string; weight: number }> = [];
      let detrLabels: string[] = [];
      let heading = waypoint.heading;

      const near = nearestMoodPlace(
        { lat: waypoint.lat, lng: waypoint.lng },
        photoPlaces,
        250,
      );
      const poiDistanceM = near
        ? Math.round(
            haversineDistance(
              { lat: waypoint.lat, lng: waypoint.lng },
              { lat: near.lat, lng: near.lng },
            ),
          )
        : undefined;
      const boost = poiProximityBoost(poiDistanceM ?? Infinity, Boolean(near));

      try {
        const capture = await captureBestMoodView(waypoint, routeMood, near);
        if (capture) {
          streetViewStatus = capture.streetViewStatus;
          labels = capture.labels;
          labelWeights = capture.labelWeights;
          detrLabels = capture.detrLabels;
          heading = capture.heading;
          if (capture.imageBase64) {
            imageBase64 = capture.imageBase64;
          }
        }
      } catch {
        streetViewStatus = "ERROR";
      }

      const rawNode = scoreMonumationNode(waypoint.lat, waypoint.lng, labels, {
        labelWeights,
        detrLabels,
      });
      const rawMoodScore =
        routeMood === "heritage"
          ? rawNode.heritage_score
          : routeMood === "scenic"
            ? rawNode.scenic_score
            : routeMood === "arts"
              ? rawNode.art_score
              : rawNode.promenade_score;

      const scored = scoreMonumationNode(waypoint.lat, waypoint.lng, labels, {
        labelWeights,
        detrLabels,
        poiBoost: { [routeMood]: boost },
      });

      nodes.push({
        ...scored,
        index,
        distanceM: waypoint.distanceM,
        heading,
        imageBase64,
        streetViewStatus,
        kvkkMasked: false,
        nearbyPoi: near?.name,
        poiDistanceM,
        rawMoodScore,
        poiBoost: boost,
        visionLabels: labels,
      });
    }

    let scoringEngine: "monumation-go" | "nextjs" = "nextjs";
    const goScan = await scanViaGoEngine(
      route.coordinates,
      nodes.map((node) => ({
        index: node.index,
        labels: node.visionLabels ?? [],
        imageBase64: node.imageBase64,
      })),
      maxPoints,
    );

    if (goScan?.results?.length) {
      scoringEngine = "monumation-go";
      for (const goNode of goScan.results) {
        const target = nodes[goNode.index];
        if (!target) continue;
        const boost = target.poiBoost ?? 0;
        target.heritage_score = Math.min(
          100,
          Math.round(goNode.heritage_score) +
            (routeMood === "heritage" ? boost : 0),
        );
        target.scenic_score = Math.min(
          100,
          Math.round(goNode.scenic_score) +
            (routeMood === "scenic" ? boost : 0),
        );
        target.art_score = Math.min(
          100,
          Math.round(goNode.art_score) + (routeMood === "arts" ? boost : 0),
        );
        target.promenade_score = Math.min(
          100,
          Math.round(goNode.promenade_score) +
            (routeMood === "promenade" ? boost : 0),
        );
        target.dominant_mood_tag = goNode.dominant_mood_tag;
        target.rawMoodScore = goScoreForMood(goNode, routeMood);
        target.kvkkMasked = false;
        target.scoringEngine = "monumation-go";
      }
    }

    for (const node of nodes) {
      capWeakPromenadeFromLabels(node);
    }

    const streetMoodAverage = averageMoodScore(nodes, routeMood);
    const combinedScore = blendCorridorScores(
      streetMoodAverage,
      placesScore,
      photoVisionAverage,
    );

    return NextResponse.json({
      engine: "monumation",
      scoringEngine,
      goEngineOnline: goHealth.online,
      mode: "places_plus_street_mood",
      routeMood,
      start,
      end,
      coordinates: route.coordinates,
      distanceM: route.distanceM,
      durationS: route.durationS,
      pois: poiHighlights,
      nodes,
      summary: {
        samplePoints: nodes.length,
        placesFound: photoPlaces.length,
        streetMoodAverage,
        placesMoodScore: placesScore,
        photoVisionAverage,
        combinedScore,
        moodAverage: combinedScore,
        heritageAverage: averageMoodScore(nodes, "heritage"),
        scenicAverage: averageMoodScore(nodes, "scenic"),
        artsAverage: averageMoodScore(nodes, "arts"),
        promenadeAverage: averageMoodScore(nodes, "promenade"),
        kvkkMaskedCount: nodes.filter((n) => n.kvkkMasked).length,
        corridorVerdict: corridorVerdict(
          streetMoodAverage,
          placesScore,
          photoPlaces.length,
          routeMood,
        ),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Monumation scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
