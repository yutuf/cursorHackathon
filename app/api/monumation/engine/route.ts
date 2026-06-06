import { NextResponse } from "next/server";
import { checkGoEngineHealth } from "@/lib/monumation-engine";

export async function GET() {
  const health = await checkGoEngineHealth();
  const configuredUrl = process.env.MONUMATION_GO_URL?.trim().replace(/\/$/, "");
  return NextResponse.json({
    engine: "monumation",
    goEngineOnline: health.online,
    stack: health.stack ?? null,
    configured: Boolean(configuredUrl),
    url: configuredUrl ?? (process.env.VERCEL ? null : "http://localhost:8090"),
  });
}
