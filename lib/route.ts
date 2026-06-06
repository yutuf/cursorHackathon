export type LatLng = {
  lat: number;
  lng: number;
};

export type StorefrontSide = "left" | "right";

export type RouteWaypoint = LatLng & {
  /** Camera heading — perpendicular to route, facing shop facades */
  heading: number;
  /** Direction of travel along the route */
  routeHeading: number;
  /** Which side of the street the camera looks toward */
  side: StorefrontSide;
  /** Offset capture point closer to the sidewalk/buildings */
  captureLat: number;
  captureLng: number;
  distanceM: number;
};

export type DrivingRoute = {
  coordinates: LatLng[];
  distanceM: number;
  durationS: number;
  /** Step names from OSRM, used to detect highways and arterials */
  roadNames: string[];
};

export type RouteScanWarning = {
  code: "high_speed_road" | "long_corridor" | "arterial_road";
  title: string;
  message: string;
  suggestion: string;
};

const ARTERIAL_ROAD_PATTERNS = [
  /\botoyol\b/i,
  /\bmotorway\b/i,
  /\bhighway\b/i,
  /\bexpressway\b/i,
  /\bçevre\s*yolu\b/i,
  /\bcevre\s*yolu\b/i,
  /\btem\b/i,
  /\be-?5\b/i,
  /\be-?80\b/i,
  /\bo-?1\b/i,
  /\bo-?2\b/i,
  /\btrans\s*european\b/i,
  /\bana\s*arter\b/i,
];

/** Warn when the corridor is unlikely to yield good storefront imagery. */
export function assessRouteForStorefrontScan(
  route: Pick<DrivingRoute, "distanceM" | "durationS" | "roadNames">,
  start: LatLng,
  end: LatLng,
): RouteScanWarning | null {
  const avgSpeedKmh =
    route.durationS > 0 ? (route.distanceM * 3.6) / route.durationS : 0;
  const directM = haversineDistance(start, end);
  const straightness =
    route.distanceM > 0 ? directM / route.distanceM : 1;

  const matchedArterial = route.roadNames.find((name) =>
    ARTERIAL_ROAD_PATTERNS.some((pattern) => pattern.test(name)),
  );

  if (matchedArterial) {
    return {
      code: "arterial_road",
      title: "Busy main road detected",
      message: `This route follows "${matchedArterial}" — a fast commercial artery or highway.`,
      suggestion:
        "Draw a shorter corridor along a narrow shop-lined side street instead.",
    };
  }

  if (avgSpeedKmh >= 42) {
    return {
      code: "high_speed_road",
      title: "Fast road detected",
      message: `Average speed is about ${Math.round(avgSpeedKmh)} km/h. Street View will mostly capture traffic and asphalt, not shop facades.`,
      suggestion:
        "Pick a slower commercial street with visible storefronts (under ~35 km/h).",
    };
  }

  if (route.distanceM > 2_200) {
    return {
      code: "long_corridor",
      title: "Corridor is very long",
      message: `This scan covers ${(route.distanceM / 1000).toFixed(1)} km. Bulan samples up to 15 points — long arterials dilute results.`,
      suggestion: "Try a 500 m–1 km stretch of dense retail streets.",
    };
  }

  if (
    route.distanceM > 700 &&
    straightness > 0.96 &&
    avgSpeedKmh >= 35
  ) {
    return {
      code: "arterial_road",
      title: "Straight commercial boulevard",
      message:
        "This looks like a long, straight main road. Storefronts may be set back or blocked by parked vehicles.",
      suggestion:
        "Scan a parallel side street where shops face the sidewalk directly.",
    };
  }

  return null;
}

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_SAMPLE_INTERVAL_M = 45;
const DEFAULT_MAX_POINTS = 12;
const STOREFRONT_OFFSET_M = 12;

export function haversineDistance(a: LatLng, b: LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return (bearingToDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function polylineLength(coordinates: LatLng[]): number {
  let total = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    total += haversineDistance(coordinates[index], coordinates[index + 1]);
  }
  return total;
}

export function pointAtDistance(
  coordinates: LatLng[],
  distanceM: number,
): { point: LatLng; routeHeading: number } {
  if (coordinates.length === 0) {
    throw new Error("Cannot sample an empty polyline.");
  }
  if (coordinates.length === 1) {
    return { point: coordinates[0], routeHeading: 0 };
  }

  const clampedDistance = Math.max(0, Math.min(distanceM, polylineLength(coordinates)));
  let traversedM = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const segmentLength = haversineDistance(start, end);
    if (segmentLength === 0) continue;

    if (traversedM + segmentLength >= clampedDistance) {
      const ratio =
        segmentLength === 0
          ? 0
          : (clampedDistance - traversedM) / segmentLength;
      const point = interpolate(start, end, ratio);
      const lookAhead =
        ratio > 0.85 && index < coordinates.length - 2
          ? coordinates[index + 2]
          : end;
      return { point, routeHeading: bearing(point, lookAhead) };
    }

    traversedM += segmentLength;
  }

  const last = coordinates[coordinates.length - 1];
  const previous = coordinates[coordinates.length - 2] ?? last;
  return { point: last, routeHeading: bearing(previous, last) };
}

/** Evenly spaced points from route start to end (by distance, not vertex index). */
export function samplePolylineEvenly(
  coordinates: LatLng[],
  pointCount: number,
): Array<LatLng & { distanceM: number }> {
  if (coordinates.length === 0 || pointCount < 1) return [];
  if (pointCount === 1) {
    return [{ ...coordinates[0], distanceM: 0 }];
  }

  const totalDistance = polylineLength(coordinates);
  const samples: Array<LatLng & { distanceM: number }> = [];

  for (let index = 0; index < pointCount; index += 1) {
    const distanceM = (index / (pointCount - 1)) * totalDistance;
    const { point } = pointAtDistance(coordinates, distanceM);
    samples.push({ ...point, distanceM: Math.round(distanceM) });
  }

  return samples;
}

export function sampleRouteWaypoints(
  coordinates: LatLng[],
  intervalM = DEFAULT_SAMPLE_INTERVAL_M,
  maxPoints = DEFAULT_MAX_POINTS,
): RouteWaypoint[] {
  if (coordinates.length === 0) return [];
  if (coordinates.length === 1) {
    return [buildWaypoint(coordinates[0], 0, 0, 0)];
  }

  const totalDistance = polylineLength(coordinates);
  if (totalDistance === 0) {
    return [buildWaypoint(coordinates[0], 0, 0, 0)];
  }

  const countByInterval = Math.max(2, Math.floor(totalDistance / intervalM) + 1);
  const pointCount = Math.min(maxPoints, countByInterval);
  const waypoints: RouteWaypoint[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const distanceM =
      pointCount === 1 ? 0 : (index / (pointCount - 1)) * totalDistance;
    const { point, routeHeading } = pointAtDistance(coordinates, distanceM);
    waypoints.push(
      buildWaypoint(point, routeHeading, Math.round(distanceM), index),
    );
  }

  return waypoints;
}

export async function fetchDrivingRoute(
  start: LatLng,
  end: LatLng,
): Promise<DrivingRoute> {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
  );
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "true");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Routing request failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    code: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
      legs?: Array<{
        steps?: Array<{ name?: string }>;
      }>;
    }>;
    message?: string;
  };

  if (body.code !== "Ok" || !body.routes?.[0]) {
    throw new Error(body.message ?? "No driving route found between these points");
  }

  const route = body.routes[0];
  const roadNames = (route.legs?.[0]?.steps ?? [])
    .map((step) => step.name?.trim())
    .filter((name): name is string => Boolean(name));

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
    roadNames,
  };
}

function interpolate(start: LatLng, end: LatLng, ratio: number): LatLng {
  return {
    lat: start.lat + (end.lat - start.lat) * ratio,
    lng: start.lng + (end.lng - start.lng) * ratio,
  };
}

function bearingToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function offsetByMeters(
  point: LatLng,
  headingDegrees: number,
  distanceM: number,
): LatLng {
  const angularDistance = distanceM / EARTH_RADIUS_M;
  const headingRad = (headingDegrees * Math.PI) / 180;
  const latRad = (point.lat * Math.PI) / 180;

  return {
    lat:
      point.lat +
      ((angularDistance * Math.cos(headingRad) * 180) / Math.PI),
    lng:
      point.lng +
      ((angularDistance * Math.sin(headingRad) * 180) /
        (Math.PI * Math.cos(latRad))),
  };
}

function projectOnSegment(
  point: LatLng,
  start: LatLng,
  end: LatLng,
): LatLng {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  if (dx === 0 && dy === 0) return start;

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  return {
    lat: start.lat + t * dy,
    lng: start.lng + t * dx,
  };
}

/** Nearest point on a road polyline to a place coordinate. */
export function closestPointOnPolyline(
  point: LatLng,
  polyline: LatLng[],
): LatLng {
  if (polyline.length === 0) return point;
  if (polyline.length === 1) return polyline[0];

  let best = polyline[0];
  let bestDistance = haversineDistance(point, best);

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const projected = projectOnSegment(
      point,
      polyline[index],
      polyline[index + 1],
    );
    const distance = haversineDistance(point, projected);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = projected;
    }
  }

  return best;
}

function buildWaypoint(
  point: LatLng,
  routeHeading: number,
  distanceM: number,
  index: number,
): RouteWaypoint {
  const side: StorefrontSide = index % 2 === 0 ? "right" : "left";
  const cameraHeading =
    side === "right"
      ? (routeHeading + 90) % 360
      : (routeHeading + 270) % 360;
  const offsetHeading = side === "right" ? cameraHeading : cameraHeading;
  const capturePoint = offsetByMeters(point, offsetHeading, STOREFRONT_OFFSET_M);

  return {
    lat: point.lat,
    lng: point.lng,
    heading: cameraHeading,
    routeHeading,
    side,
    captureLat: capturePoint.lat,
    captureLng: capturePoint.lng,
    distanceM,
  };
}
