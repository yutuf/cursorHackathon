import { NextRequest, NextResponse } from "next/server";
import {
  fetchStreetViewMetadata,
  parseStreetViewParams,
} from "@/lib/streetview";

export async function GET(request: NextRequest) {
  const parsed = parseStreetViewParams(request.nextUrl.searchParams);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const metadata = await fetchStreetViewMetadata(parsed.lat, parsed.lng);
    return NextResponse.json(metadata);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch metadata";
    const status = message.includes("not configured") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
