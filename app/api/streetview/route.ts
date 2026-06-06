import { NextRequest, NextResponse } from "next/server";
import {
  buildStreetViewUrl,
  getApiKey,
  parseStreetViewParams,
} from "@/lib/streetview";

export async function GET(request: NextRequest) {
  const parsed = parseStreetViewParams(request.nextUrl.searchParams);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const apiKey = getApiKey();
    const googleUrl = buildStreetViewUrl(parsed, apiKey);
    const response = await fetch(googleUrl);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "No Street View imagery available for this location.",
          status: response.status,
        },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Street View image";
    const status = message.includes("not configured") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
