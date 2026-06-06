import { NextRequest, NextResponse } from "next/server";
import {
  applyCompareScore,
  scoreCorridorFast,
  type CorridorScoreResult,
} from "@/lib/monumation-corridor";
import type { RouteMood } from "@/lib/monumation";
import { getCorridorComparePair } from "@/lib/places-mood";

const VALID_MOODS: RouteMood[] = ["heritage", "scenic", "arts", "promenade"];

function poiDensityPerKm(result: CorridorScoreResult): number {
  return result.summary.placesFound / Math.max(0.35, result.distanceM / 1000);
}

function pickCompareWinner(
  moodPath: CorridorScoreResult,
  blindPath: CorridorScoreResult,
): "good" | "weak" {
  if (moodPath.summary.combinedScore !== blindPath.summary.combinedScore) {
    return moodPath.summary.combinedScore > blindPath.summary.combinedScore
      ? "good"
      : "weak";
  }
  return poiDensityPerKm(moodPath) >= poiDensityPerKm(blindPath)
    ? "good"
    : "weak";
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { routeMood?: RouteMood };

  try {
    body = (await request.json()) as { routeMood?: RouteMood };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const routeMood = VALID_MOODS.includes(body.routeMood as RouteMood)
    ? (body.routeMood as RouteMood)
    : "heritage";

  const pair = getCorridorComparePair(routeMood);

  try {
    const [goodRaw, weakRaw] = await Promise.all([
      scoreCorridorFast(pair.good.name, pair.good.start, pair.good.end, routeMood),
      scoreCorridorFast(pair.weak.name, pair.weak.start, pair.weak.end, routeMood),
    ]);

    const good = applyCompareScore(goodRaw, "mood");
    const weak = applyCompareScore(weakRaw, "blind");
    const winner = pickCompareWinner(good, weak);
    const delta = Math.abs(good.summary.combinedScore - weak.summary.combinedScore);

    const { checkGoEngineHealth } = await import("@/lib/monumation-engine");
    const goHealth = await checkGoEngineHealth();

    return NextResponse.json({
      engine: "monumation",
      scoringEngine: goHealth.online ? "monumation-go" : "nextjs",
      goEngineOnline: goHealth.online,
      mode: "corridor_compare",
      routeMood,
      winner,
      delta,
      good: {
        ...good,
        tip: pair.good.tip,
        label: "Mood corridor (Monumation pick)",
        pathRole: "mood",
      },
      weak: {
        ...weak,
        tip: pair.weak.tip,
        label: "Blind walk (functional path)",
        pathRole: "blind",
      },
      pitch:
        winner === "good"
          ? `Google-style blind walk scores ${weak.summary.combinedScore}. Monumation's ${routeMood} corridor scores ${good.summary.combinedScore} — Δ ${delta} because route choice matters.`
          : "Unexpected — verify API keys and retry demo presets.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Corridor compare failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
