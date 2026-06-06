import { NextRequest, NextResponse } from "next/server";
import type { BusinessCategory } from "@/lib/bulan";
import type { AreaBounds } from "@/lib/area";
import { fetchAreaRoadNetwork } from "@/lib/google-maps";
import {
  placeToDetection,
  type DiscoveredPlace,
} from "@/lib/places-discovery";
import {
  bearing,
  closestPointOnPolyline,
  offsetByMeters,
  type LatLng,
} from "@/lib/route";
import {
  buildStreetViewUrl,
  fetchStreetViewMetadata,
  getApiKey,
  STOREFRONT_CAPTURE,
} from "@/lib/streetview";

type VerifyRequestBody = {
  places?: DiscoveredPlace[];
  bounds?: AreaBounds;
  businessCategory?: BusinessCategory;
  maxPhotos?: number;
};

const MAX_PHOTOS = 8;

export type VerifiedPlaceResult = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  heading: number;
  imageBase64: string | null;
  detection: ReturnType<typeof placeToDetection>;
};

export async function POST(request: NextRequest) {
  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const places = body.places ?? [];
  const businessCategory = body.businessCategory ?? "coffee_shop";
  const maxPhotos = Math.min(MAX_PHOTOS, Math.max(1, body.maxPhotos ?? 6));

  if (!places.length) {
    return NextResponse.json({ error: "No places to verify." }, { status: 400 });
  }

  let roadPolyline: LatLng[] = [];
  if (body.bounds) {
    try {
      const roads = await fetchAreaRoadNetwork(body.bounds);
      roadPolyline = roads.coordinates;
    } catch {
      roadPolyline = [];
    }
  }

  const targets = places.slice(0, maxPhotos);
  const results: VerifiedPlaceResult[] = [];

  for (const place of targets) {
    const shopPoint = { lat: place.lat, lng: place.lng };
    const roadPoint =
      roadPolyline.length > 1
        ? closestPointOnPolyline(shopPoint, roadPolyline)
        : shopPoint;

    const lookHeading = bearing(roadPoint, shopPoint);
    const cameraPoint = offsetByMeters(roadPoint, lookHeading, 6);

    let status = "ERROR";
    let imageBase64: string | null = null;

    try {
      const metadata = await fetchStreetViewMetadata(
        cameraPoint.lat,
        cameraPoint.lng,
      );
      status = metadata.status;

      if (metadata.status === "OK") {
        const imageResponse = await fetch(
          buildStreetViewUrl(
            {
              lat: cameraPoint.lat,
              lng: cameraPoint.lng,
              heading: lookHeading,
              pitch: 8,
              fov: 80,
              width: STOREFRONT_CAPTURE.width,
              height: STOREFRONT_CAPTURE.height,
            },
            getApiKey(),
          ),
        );

        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          imageBase64 = `data:${imageResponse.headers.get("content-type") ?? "image/jpeg"};base64,${buffer.toString("base64")}`;
        }
      }
    } catch {
      status = "ERROR";
    }

    results.push({
      placeId: place.placeId,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      status,
      heading: lookHeading,
      imageBase64,
      detection: placeToDetection(place, businessCategory),
    });
  }

  return NextResponse.json({
    results,
    summary: {
      requested: targets.length,
      withImagery: results.filter((item) => item.imageBase64).length,
      mode: "street_view_optional_verify",
    },
  });
}
