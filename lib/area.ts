import {
  bearing,
  haversineDistance,
  type LatLng,
  type RouteScanWarning,
  type RouteWaypoint,
  type StorefrontSide,
} from "@/lib/route";

export type AreaBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const DEFAULT_SAMPLE_INTERVAL_M = 20;
const DEFAULT_MAX_POINTS = 15;
const MIN_AREA_SIDE_M = 40;
const MAX_AREA_SIDE_M = 600;

export function normalizeBounds(cornerA: LatLng, cornerB: LatLng): AreaBounds {
  return {
    north: Math.max(cornerA.lat, cornerB.lat),
    south: Math.min(cornerA.lat, cornerB.lat),
    east: Math.max(cornerA.lng, cornerB.lng),
    west: Math.min(cornerA.lng, cornerB.lng),
  };
}

export function boundsCenter(bounds: AreaBounds): LatLng {
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };
}

export function boundsRing(bounds: AreaBounds): LatLng[] {
  return [
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
    { lat: bounds.south, lng: bounds.east },
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.north, lng: bounds.west },
  ];
}

export function measureBounds(bounds: AreaBounds): {
  widthM: number;
  heightM: number;
  areaM2: number;
} {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;
  const widthM = haversineDistance(
    { lat: centerLat, lng: bounds.west },
    { lat: centerLat, lng: bounds.east },
  );
  const heightM = haversineDistance(
    { lat: bounds.south, lng: centerLng },
    { lat: bounds.north, lng: centerLng },
  );

  return {
    widthM: Math.round(widthM),
    heightM: Math.round(heightM),
    areaM2: Math.round(widthM * heightM),
  };
}

export function assessAreaForStorefrontScan(bounds: AreaBounds): RouteScanWarning | null {
  const { widthM, heightM, areaM2 } = measureBounds(bounds);

  if (widthM < MIN_AREA_SIDE_M || heightM < MIN_AREA_SIDE_M) {
    return {
      code: "long_corridor",
      title: "Area is too small",
      message: `Selection is only ${widthM}×${heightM} m. Widen the box to cover several streets.`,
      suggestion: "Drag a larger rectangle over the neighborhood you want to compare.",
    };
  }

  if (widthM > MAX_AREA_SIDE_M || heightM > MAX_AREA_SIDE_M) {
    return {
      code: "long_corridor",
      title: "Area is very large",
      message: `Selection is ${widthM}×${heightM} m (${(areaM2 / 10_000).toFixed(1)} ha). Bulan samples up to 15 points across the box.`,
      suggestion: "Use a smaller neighborhood block so results stay focused.",
    };
  }

  const aspect = Math.max(widthM, heightM) / Math.max(1, Math.min(widthM, heightM));
  if (aspect > 4) {
    return {
      code: "arterial_road",
      title: "Very narrow selection",
      message:
        "This looks like a thin strip along one street. A wider area captures parallel shops too.",
      suggestion: "Drag a box that includes side streets and cross streets.",
    };
  }

  return null;
}

function metersToLatDelta(meters: number): number {
  return (meters / 6_371_000) * (180 / Math.PI);
}

function metersToLngDelta(meters: number, latitude: number): number {
  const latRad = (latitude * Math.PI) / 180;
  return (meters / (6_371_000 * Math.cos(latRad))) * (180 / Math.PI);
}

function subsampleEvenly<T>(items: T[], maxItems: number): T[] {
  if (items.length <= maxItems) return items;
  if (maxItems <= 1) return [items[0]];

  const result: T[] = [];
  const step = (items.length - 1) / (maxItems - 1);
  for (let index = 0; index < maxItems; index += 1) {
    result.push(items[Math.round(index * step)]);
  }
  return result;
}

function buildAreaWaypoint(
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

  return {
    lat: point.lat,
    lng: point.lng,
    heading: cameraHeading,
    routeHeading,
    side,
    captureLat: point.lat,
    captureLng: point.lng,
    distanceM,
  };
}

export function sampleAreaWaypoints(
  bounds: AreaBounds,
  intervalM = DEFAULT_SAMPLE_INTERVAL_M,
  maxPoints = DEFAULT_MAX_POINTS,
): RouteWaypoint[] {
  const centerLat = (bounds.north + bounds.south) / 2;
  const latStep = metersToLatDelta(intervalM);
  const lngStep = metersToLngDelta(intervalM, centerLat);

  const gridPoints: LatLng[] = [];
  let rowIndex = 0;

  for (let lat = bounds.south; lat <= bounds.north + latStep / 2; lat += latStep) {
    const row: LatLng[] = [];
    for (let lng = bounds.west; lng <= bounds.east + lngStep / 2; lng += lngStep) {
      row.push({
        lat: Math.min(bounds.north, lat),
        lng: Math.min(bounds.east, lng),
      });
    }

    if (rowIndex % 2 === 1) {
      row.reverse();
    }

    gridPoints.push(...row);
    rowIndex += 1;
  }

  const selected = subsampleEvenly(gridPoints, maxPoints);

  return selected.map((point, index) => {
    const next = selected[index + 1];
    const previous = selected[index - 1];
    const routeHeading = next
      ? bearing(point, next)
      : previous
        ? bearing(previous, point)
        : 90;

    return buildAreaWaypoint(point, routeHeading, index * intervalM, index);
  });
}
