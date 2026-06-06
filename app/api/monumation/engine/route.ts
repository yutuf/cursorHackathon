import { NextResponse } from "next/server";
import { checkGoEngineHealth } from "@/lib/monumation-engine";

export async function GET() {
  const health = await checkGoEngineHealth();
  return NextResponse.json({
    engine: "monumation",
    goEngineOnline: health.online,
    stack: health.stack ?? null,
    url: process.env.MONUMATION_GO_URL ?? "http://localhost:8090",
  });
}
