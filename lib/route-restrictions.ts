import { fetchGoogleDirections, reverseGeocode } from "@/lib/google-maps";
import { haversineDistance, type DrivingRoute, type LatLng } from "@/lib/route";
import { fetchStreetViewMetadata } from "@/lib/streetview";

export type WalkabilityResult = {
  ok: boolean;
  reason?: string;
};

/** City-level geocode hits (e.g. "Istanbul") are not enough — coast/ocean pins slip through. */
const FINE_WALKABLE_TYPES = new Set([
  "street_address",
  "route",
  "intersection",
  "premise",
  "subpremise",
  "establishment",
  "point_of_interest",
  "park",
  "tourist_attraction",
  "mosque",
  "church",
  "museum",
  "cafe",
  "restaurant",
  "store",
  "town_square",
  "postal_code",
]);

const COARSE_TYPES = new Set([
  "country",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "natural_feature",
  "colloquial_area",
  "political",
]);

const WATER_HINT =
  /\b(sea|ocean|strait|channel|gulf|open water|waterbody|lake|pond|reservoir|maritime|aegean|marmara|mediterranean|bosporus|bosphorus|adriatic|black sea|harbor|harbour)\b/i;

const FERRY_HINT = /\b(ferry|boat|vessel|crossing)\b/i;

/** Street View snaps ocean pins to the nearest shore — reject large snap gaps. */
const MAX_STREETVIEW_SNAP_M = 55;

function hasFineWalkableType(types: string[]): boolean {
  return types.some((type) => FINE_WALKABLE_TYPES.has(type));
}

function looksLikeOnlyCityLevel(types: string[]): boolean {
  if (hasFineWalkableType(types)) return false;
  if (!types.length) return true;
  return types.every(
    (type) =>
      COARSE_TYPES.has(type) ||
      type === "locality" ||
      type === "sublocality" ||
      type === "sublocality_level_1" ||
      type === "neighborhood" ||
      type === "plus_code",
  );
}

/** Reject pins dropped on sea, lakes, or other non-walkable spots. */
export async function validateWalkablePoint(
  point: LatLng,
): Promise<WalkabilityResult> {
  const geo = await reverseGeocode(point);

  if (geo.status === "ZERO_RESULTS") {
    return {
      ok: false,
      reason:
        "No land address here — place your pin on a street, park, or landmark.",
    };
  }

  const results = geo.results ?? [];
  const primary = results[0];
  if (!primary) {
    return {
      ok: false,
      reason: "Could not verify this location — try a point on shore or a street.",
    };
  }

  if (WATER_HINT.test(primary.formatted_address)) {
    return {
      ok: false,
      reason: "That looks like open water. Pins must be on walkable land.",
    };
  }

  const primaryTypes = primary.types ?? [];
  const fineWalkable = hasFineWalkableType(primaryTypes);
  const cityLevelOnly = looksLikeOnlyCityLevel(primaryTypes);

  const streetView = await fetchStreetViewMetadata(point.lat, point.lng);
  let streetSnapM = Infinity;
  if (
    streetView.status === "OK" &&
    streetView.location?.lat !== undefined &&
    streetView.location?.lng !== undefined
  ) {
    streetSnapM = haversineDistance(point, {
      lat: streetView.location.lat,
      lng: streetView.location.lng,
    });
  }

  const onStreet =
    streetView.status === "OK" && streetSnapM <= MAX_STREETVIEW_SNAP_M;

  if (onStreet) {
    return { ok: true };
  }

  if (fineWalkable && !cityLevelOnly) {
    return { ok: true };
  }

  if (streetView.status === "OK" && streetSnapM > MAX_STREETVIEW_SNAP_M) {
    return {
      ok: false,
      reason:
        "Pin is too far from any walkable street — move it onto land, not the sea.",
    };
  }

  if (cityLevelOnly) {
    return {
      ok: false,
      reason:
        "Too vague — zoom in and pin an actual street or landmark, not open water.",
    };
  }

  return {
    ok: false,
    reason:
      "No walkable street nearby — place the pin on a road, path, or plaza.",
  };
}

export function validateEndpointDistance(
  start: LatLng,
  end: LatLng,
): WalkabilityResult {
  const straightM = haversineDistance(start, end);
  if (straightM < 40) {
    return {
      ok: false,
      reason: "Start and end are too close — spread the pins along your walk.",
    };
  }
  if (straightM > 25_000) {
    return {
      ok: false,
      reason: "Route is too long for a mood corridor scan (max ~25 km).",
    };
  }
  return { ok: true };
}

export function validateWalkingRouteShape(
  start: LatLng,
  end: LatLng,
  route: DrivingRoute,
): WalkabilityResult {
  const straightM = haversineDistance(start, end);

  if (FERRY_HINT.test(route.roadNames.join(" "))) {
    return {
      ok: false,
      reason:
        "This walking route uses a ferry. Pick both pins on the same shore.",
    };
  }

  if (straightM > 400 && route.distanceM > straightM * 3.2) {
    return {
      ok: false,
      reason:
        "Walking route detours too far — pins may be across water. Use a bridge route.",
    };
  }

  return { ok: true };
}

/** Validate endpoints before fetching directions (map pin drops). */
export async function validateWalkableEndpoints(
  start: LatLng,
  end: LatLng,
): Promise<WalkabilityResult> {
  const startCheck = await validateWalkablePoint(start);
  if (!startCheck.ok) {
    return { ok: false, reason: `Start: ${startCheck.reason}` };
  }

  const endCheck = await validateWalkablePoint(end);
  if (!endCheck.ok) {
    return { ok: false, reason: `End: ${endCheck.reason}` };
  }

  return validateEndpointDistance(start, end);
}

/** Full corridor check — fetches walking directions once. */
export async function validateWalkableRoute(
  start: LatLng,
  end: LatLng,
): Promise<WalkabilityResult> {
  const endpoints = await validateWalkableEndpoints(start, end);
  if (!endpoints.ok) return endpoints;

  try {
    const route = await fetchGoogleDirections(start, end, [], "walking");
    return validateWalkingRouteShape(start, end, route);
  } catch {
    return {
      ok: false,
      reason:
        "No walking route between these points — they may be separated by water.",
    };
  }
}
