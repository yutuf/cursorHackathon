import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  type OpportunitySummary,
} from "@/lib/bulan";

export type BriefDetection = {
  distanceM: number;
  side: string;
  objectType: string;
  confidence: number;
  signText?: string;
  caption?: string;
};

export type BriefRequest = {
  businessCategory: BusinessCategory;
  corridor?: {
    distanceM?: number;
    durationS?: number;
    samplePoints?: number;
  };
  opportunities: OpportunitySummary;
  detections: BriefDetection[];
};

export function buildBriefPrompt(input: BriefRequest): string {
  const categoryLabel =
    BUSINESS_CATEGORIES.find((item) => item.id === input.businessCategory)
      ?.label ?? input.businessCategory;

  const corridor = input.corridor;
  const highlights = input.detections
    .filter((item) => item.objectType !== "unknown")
    .slice(0, 8)
    .map(
      (item) =>
        `- ${item.distanceM}m (${item.side}): ${item.objectType}${item.signText ? ` — sign "${item.signText}"` : ""}`,
    )
    .join("\n");

  return `You are Bulan AI, a public-benefit neighborhood revitalization tool for Istanbul municipalities and local entrepreneurs.

Write a concise municipal revitalization brief (max 220 words) analyzing whether this area needs more ${categoryLabel} services — framed for kamu faydası (public benefit): protecting esnaf (small merchants), filling community supply gaps, and activating vacant storefronts.

Area stats:
- Coverage: ${corridor?.distanceM ? `${(corridor.distanceM / 1000).toFixed(2)} km` : "unknown"}
- Sample points scanned: ${corridor?.samplePoints ?? input.detections.length}
- Revitalization index: ${input.opportunities.opportunityScore}/100

Counts:
- Vacant storefronts: ${input.opportunities.vacant}
- For rent (Kiralık): ${input.opportunities.for_rent}
- For sale (Satılık): ${input.opportunities.for_sale}
- Sector saturation (${categoryLabel}): ${input.opportunities.competitors}
- Other active shops: ${input.opportunities.shops}
- Unclassified: ${input.opportunities.unknown}

Notable detections:
${highlights || "- No strong detections"}

Structure your answer with these headings:
## Public benefit verdict
## Community supply gaps
## Esnaf protection (saturation risk)
## Municipal next steps

Be practical. Frame recommendations for both city planners and entrepreneurs. Do not invent addresses. Mention uncertainty where detections are unclassified. Note KVKK-compliant, signboard-only analysis.`;
}

export function buildFallbackBrief(input: BriefRequest): string {
  const categoryLabel =
    BUSINESS_CATEGORIES.find((item) => item.id === input.businessCategory)
      ?.label ?? input.businessCategory;
  const score = input.opportunities.opportunityScore;
  const openings =
    input.opportunities.vacant +
    input.opportunities.for_rent +
    input.opportunities.for_sale;

  let verdict = "Mixed neighborhood — review detections on the map.";
  if (score >= 70 && openings > 0) {
    verdict = `Community ${categoryLabel} gap identified — ${openings} vacant or listed unit(s) with limited sector saturation. Good candidate for municipal incentive or esnaf placement.`;
  } else if (input.opportunities.competitors >= 3) {
    verdict = `Sector saturation risk for ${categoryLabel} — ${input.opportunities.competitors} likely competitors; steer new merchants elsewhere to protect local businesses.`;
  } else if (openings === 0) {
    verdict = "Few vacant or listed storefronts detected — consider a different neighborhood block.";
  }

  return `## Public benefit verdict
${verdict} Revitalization index: **${score}/100**.

## Community supply gaps
Vacant: ${input.opportunities.vacant}, Kiralık: ${input.opportunities.for_rent}, Satılık: ${input.opportunities.for_sale}.

## Esnaf protection (saturation risk)
${input.opportunities.competitors} direct competitor(s), ${input.opportunities.shops} other active shops, ${input.opportunities.unknown} unclassified.

## Municipal next steps
Verify signs on foot, share index with local planning office, target grants for underserved sectors. Add \`CURSOR_API_KEY\` for full Cursor agent analysis.

---
*Template brief — KVKK-compliant signboard-only analysis. Set CURSOR_API_KEY for AI-written municipal brief.*`;
}
