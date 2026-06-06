import type { RouteMood } from "@/lib/monumation";
import type { LatLng } from "@/lib/route";

const DEFAULT_GO_URL = "http://localhost:8090";

function goBaseUrl(): string | null {
  const url = process.env.MONUMATION_GO_URL?.trim();
  return url || DEFAULT_GO_URL;
}

export type GoNormalizeResult = {
  engine: string;
  stack: string;
  tokens: string[];
  heritage_score: number;
  scenic_score: number;
  art_score: number;
  promenade_score: number;
  dominant_mood_tag: string;
};

export type GoScanNode = {
  index: number;
  heritage_score: number;
  scenic_score: number;
  art_score: number;
  promenade_score: number;
  dominant_mood_tag: string;
  kvkk_masked: boolean;
};

export type GoScanResult = {
  engine: string;
  stack: string;
  kvkk_masked_count: number;
  results: GoScanNode[];
};

export async function checkGoEngineHealth(): Promise<{
  online: boolean;
  stack?: string;
}> {
  const base = goBaseUrl();
  if (!base) return { online: false };

  try {
    const response = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { online: false };
    const body = (await response.json()) as { stack?: string };
    return { online: true, stack: body.stack ?? "masterfabric-go" };
  } catch {
    return { online: false };
  }
}

export async function normalizeViaGoEngine(
  labels: string[],
  texts: string[] = [],
): Promise<GoNormalizeResult | null> {
  const base = goBaseUrl();
  if (!base) return null;

  try {
    const response = await fetch(`${base}/monumation/normalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels, texts }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as GoNormalizeResult;
  } catch {
    return null;
  }
}

export async function scanViaGoEngine(
  coordinates: LatLng[],
  detections: Array<{
    index: number;
    labels: string[];
    texts?: string[];
    imageBase64?: string | null;
  }>,
  maxPoints = 10,
): Promise<GoScanResult | null> {
  const base = goBaseUrl();
  if (!base) return null;

  try {
    const response = await fetch(`${base}/monumation/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates,
        maxPoints,
        detections: detections.map((item) => ({
          index: item.index,
          labels: item.labels,
          texts: item.texts ?? [],
          imageBase64: item.imageBase64 ?? undefined,
        })),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return (await response.json()) as GoScanResult;
  } catch {
    return null;
  }
}

export function goScoreForMood(
  node: Pick<
    GoScanNode,
    "heritage_score" | "scenic_score" | "art_score" | "promenade_score"
  >,
  mood: RouteMood,
): number {
  switch (mood) {
    case "heritage":
      return Math.round(node.heritage_score);
    case "scenic":
      return Math.round(node.scenic_score);
    case "arts":
      return Math.round(node.art_score);
    case "promenade":
      return Math.round(node.promenade_score);
  }
}
