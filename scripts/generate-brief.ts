/**
 * Generate a Bulan opportunity brief with the Cursor SDK (local agent).
 *
 * Usage:
 *   npm run brief -- ./scan-export.json
 *   npm run brief   # uses built-in demo data
 *
 * Requires: CURSOR_API_KEY in environment
 * Get a key: https://cursor.com/dashboard/integrations
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CursorAgentError } from "@cursor/sdk";
import type { BriefRequest } from "../lib/opportunity-brief";
import { buildBriefPrompt, buildFallbackBrief } from "../lib/opportunity-brief";
import { runBriefAgent } from "../lib/cursor-agent";

const DEMO_PAYLOAD: BriefRequest = {
  businessCategory: "pharmacy",
  corridor: { distanceM: 820, samplePoints: 12 },
  opportunities: {
    vacant: 1,
    for_rent: 2,
    for_sale: 0,
    competitors: 3,
    shops: 4,
    unknown: 2,
    opportunityScore: 58,
  },
  detections: [
    {
      distanceM: 120,
      side: "right",
      objectType: "competitor",
      confidence: 0.92,
      signText: "eczane",
    },
    {
      distanceM: 280,
      side: "left",
      objectType: "for_rent",
      confidence: 0.82,
      signText: "kiralik",
    },
  ],
};

function loadPayload(): BriefRequest {
  const fileArg = process.argv[2];
  if (!fileArg) return DEMO_PAYLOAD;

  const filePath = resolve(process.cwd(), fileArg);
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as BriefRequest;
}

async function main(): Promise<void> {
  const payload = loadPayload();
  const prompt = buildBriefPrompt(payload);

  if (!process.env.CURSOR_API_KEY?.trim()) {
    console.error("CURSOR_API_KEY is not set.");
    console.error("Get one at https://cursor.com/dashboard/integrations");
    console.log("\n--- Template fallback ---\n");
    console.log(buildFallbackBrief(payload));
    process.exit(1);
  }

  console.log("Running Cursor SDK local agent...\n");

  try {
    const result = await runBriefAgent(prompt);
    console.log(result.brief);
    if (result.runId) {
      console.error(`\n[run ${result.runId} via ${result.source}]`);
    }
  } catch (error) {
    if (error instanceof CursorAgentError) {
      console.error(`Cursor SDK startup failed: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

void main();
