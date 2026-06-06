import { CursorAgentError } from "@cursor/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { BusinessCategory } from "@/lib/bulan";
import { runBriefAgent } from "@/lib/cursor-agent";
import {
  buildBriefPrompt,
  buildFallbackBrief,
  type BriefRequest,
} from "@/lib/opportunity-brief";

const VALID_CATEGORIES: BusinessCategory[] = [
  "coffee_shop",
  "electrician",
  "restaurant",
  "retail",
  "barber",
  "pharmacy",
  "grocery",
];

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: BriefRequest;

  try {
    body = (await request.json()) as BriefRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !body.opportunities ||
    !VALID_CATEGORIES.includes(body.businessCategory)
  ) {
    return NextResponse.json(
      { error: "Missing opportunities or business category." },
      { status: 400 },
    );
  }

  const prompt = buildBriefPrompt(body);

  if (!process.env.CURSOR_API_KEY?.trim()) {
    return NextResponse.json({
      brief: buildFallbackBrief(body),
      source: "template",
      hint: "Add CURSOR_API_KEY to enable Cursor SDK briefs.",
    });
  }

  try {
    const agentResult = await runBriefAgent(prompt);
    return NextResponse.json(agentResult);
  } catch (error) {
    const message =
      error instanceof CursorAgentError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Cursor agent failed";

    return NextResponse.json({
      brief: buildFallbackBrief(body),
      source: "template",
      error: message,
      hint: "Local dev with CURSOR_API_KEY is fastest. Cloud agents on Vercel can take 1–2 minutes.",
    });
  }
}
