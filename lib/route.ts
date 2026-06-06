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
};

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_SAMPLE_INTERVAL_M = 50;
const DEFAULT_MAX_POINTS = 15;
const STOREFRONT_OFFSET_M = 0;

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

export function sampleRouteWaypoints(
  coordinates: LatLng[],
  intervalM = DEFAULT_SAMPLE_INTERVAL_M,
  maxPoints = DEFAULT_MAX_POINTS,
): RouteWaypoint[] {
  if (coordinates.length === 0) return [];
  if (coordinates.length === 1) {
    return [buildWaypoint(coordinates[0], 0, 0, 0)];
  }

  const firstBearing = bearing(coordinates[0], coordinates[1]);
  const waypoints: RouteWaypoint[] = [
    buildWaypoint(coordinates[0], firstBearing, 0, 0),
  ];

  let traversedM = 0;
  let nextSampleAt = intervalM;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const segmentLength = haversineDistance(start, end);

    if (segmentLength === 0) continue;

    while (nextSampleAt <= traversedM + segmentLength) {
      if (waypoints.length >= maxPoints) {
        return finalizeWaypoints(waypoints, coordinates, maxPoints);
      }

      const offsetInSegment = nextSampleAt - traversedM;
      const ratio = offsetInSegment / segmentLength;
      const point = interpolate(start, end, ratio);
      const lookAhead =
        ratio > 0.85 && index < coordinates.length - 2
          ? coordinates[index + 2]
          : end;

      const routeHeading = bearing(point, lookAhead);
      waypoints.push(
        buildWaypoint(point, routeHeading, Math.round(nextSampleAt), waypoints.length),
      );

      nextSampleAt += intervalM;
    }

    traversedM += segmentLength;
  }

  return finalizeWaypoints(waypoints, coordinates, maxPoints);
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
    }>;
    message?: string;
  };

  if (body.code !== "Ok" || !body.routes?.[0]) {
    throw new Error(body.message ?? "No driving route found between these points");
  }

  const route = body.routes[0];

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
  };
}

function finalizeWaypoints(
  waypoints: RouteWaypoint[],
  coordinates: LatLng[],
  maxPoints: number,
): RouteWaypoint[] {
  const lastCoordinate = coordinates[coordinates.length - 1];
  const lastWaypoint = waypoints[waypoints.length - 1];
  const totalDistance = waypoints.reduce(
    (max, waypoint) => Math.max(max, waypoint.distanceM),
    0,
  );

  const alreadyHasEnd =
    lastWaypoint &&
    haversineDistance(lastWaypoint, lastCoordinate) < 20;

  if (!alreadyHasEnd && waypoints.length < maxPoints) {
    const previous = waypoints[waypoints.length - 1] ?? lastCoordinate;
    const routeHeading = bearing(previous, lastCoordinate);
    waypoints.push(
      buildWaypoint(lastCoordinate, routeHeading, totalDistance, waypoints.length),
    );
  }

  return waypoints;
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
