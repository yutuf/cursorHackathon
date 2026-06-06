import { NextRequest, NextResponse } from "next/server";
import { scoreCorridorFast } from "@/lib/monumation-corridor";
import type { RouteMood } from "@/lib/monumation";
import { getCorridorComparePair } from "@/lib/places-mood";

const VALID_MOODS: RouteMood[] = ["heritage", "scenic", "arts", "promenade"];

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
    const [good, weak] = await Promise.all([
      scoreCorridorFast(pair.good.name, pair.good.start, pair.good.end, routeMood),
      scoreCorridorFast(pair.weak.name, pair.weak.start, pair.weak.end, routeMood),
    ]);

    const winner =
      good.summary.combinedScore >= weak.summary.combinedScore ? "good" : "weak";

    const { checkGoEngineHealth } = await import("@/lib/monumation-engine");
    const goHealth = await checkGoEngineHealth();

    return NextResponse.json({
      engine: "monumation",
      scoringEngine: goHealth.online ? "monumation-go" : "nextjs",
      goEngineOnline: goHealth.online,
      mode: "corridor_compare",
      routeMood,
      winner,
      delta: Math.abs(good.summary.combinedScore - weak.summary.combinedScore),
      good: {
        ...good,
        tip: pair.good.tip,
        label: "Mood corridor (recommended)",
      },
      weak: {
        ...weak,
        tip: pair.weak.tip,
        label: "Functional stretch (avoid)",
      },
      pitch:
        winner === "good"
          ? `Same mood (${routeMood}), ${good.summary.combinedScore - weak.summary.combinedScore} pts higher on the mood-matched corridor — route choice matters.`
          : "Unexpected — verify API keys and retry demo presets.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Corridor compare failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
