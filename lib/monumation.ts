export type RouteMood = "heritage" | "scenic" | "arts" | "promenade";

export type MonumationNode = {
  lat: number;
  lng: number;
  heritage_score: number;
  scenic_score: number;
  art_score: number;
  promenade_score: number;
  dominant_mood_tag: string;
  tokens?: string[];
};

export const ROUTE_MOODS: Array<{
  id: RouteMood;
  label: string;
  labelTr: string;
  description: string;
  color: string;
}> = [
  {
    id: "heritage",
    label: "Heritage Route",
    labelTr: "Tarihi Koridor",
    description: "Stone facades, monuments, bay windows",
    color: "#b45309",
  },
  {
    id: "scenic",
    label: "Scenic / Green Route",
    labelTr: "Doğa ve Rekreasyon",
    description: "Tree canopy, parks, planters, open sky",
    color: "#15803d",
  },
  {
    id: "arts",
    label: "Arts & Culture Route",
    labelTr: "Modern Kültür ve Sanat",
    description: "Murals, modern architecture, lit plazas",
    color: "#7c3aed",
  },
  {
    id: "promenade",
    label: "Vibrant Promenade",
    labelTr: "Canlı Yaşam Koridoru",
    description: "Café terraces, pedestrian streets, lively storefronts",
    color: "#db2777",
  },
];

const HERITAGE = new Set([
  "historical_facade",
  "stone_masonry",
  "monument",
  "bay_window_cumba",
]);
const SCENIC = new Set([
  "tree_canopy",
  "park_vegetation",
  "planter_box",
  "open_sky_ratio",
]);
const ARTS = new Set([
  "street_art_mural",
  "modern_architecture",
  "pedestrian_plaza",
  "decorative_lighting",
]);
const PROMENADE = new Set([
  "pedestrianized_street",
  "cafe_terrace",
  "storefront_layout",
  "bustling_promenade",
]);
const POLLUTION = new Set([
  "plastic_billboard",
  "exposed_wiring",
  "heavy_graffiti",
  "industrial_dumpster",
  "shattered_facade",
]);

const IGNORED_VEHICLES =
  /car|truck|bus|motorcycle|minivan|van|wagon|jeep|convertible|limousine|parking meter|ambulance/i;

const LABEL_TO_TOKEN: Record<string, string> = {
  palace: "historical_facade",
  monastery: "historical_facade",
  church: "historical_facade",
  mosque: "historical_facade",
  library: "modern_architecture",
  altar: "monument",
  "triumphal arch": "monument",
  obelisk: "monument",
  pedestal: "monument",
  megalith: "monument",
  "stone wall": "stone_masonry",
  cliff: "stone_masonry",
  rock: "stone_masonry",
  brick: "stone_masonry",
  column: "stone_masonry",
  vault: "historical_facade",
  "bell cote": "historical_facade",
  "tile roof": "historical_facade",
  "bay window": "bay_window_cumba",
  building: "historical_facade",
  house: "historical_facade",
  "apartment house": "historical_facade",
  tree: "tree_canopy",
  forest: "tree_canopy",
  pine: "tree_canopy",
  oak: "tree_canopy",
  maple: "tree_canopy",
  park: "park_vegetation",
  lawn: "park_vegetation",
  flower: "park_vegetation",
  pot: "planter_box",
  greenhouse: "planter_box",
  "park bench": "pedestrian_plaza",
  valley: "open_sky_ratio",
  seashore: "open_sky_ratio",
  lakeside: "open_sky_ratio",
  promontory: "open_sky_ratio",
  graffiti: "heavy_graffiti",
  "street art": "street_art_mural",
  mural: "street_art_mural",
  skyscraper: "modern_architecture",
  fountain: "pedestrian_plaza",
  promenade: "pedestrianized_street",
  pier: "pedestrian_plaza",
  boardwalk: "pedestrianized_street",
  spotlight: "decorative_lighting",
  cafe: "cafe_terrace",
  restaurant: "cafe_terrace",
  bakery: "cafe_terrace",
  "coffee shop": "cafe_terrace",
  "grocery store": "storefront_layout",
  bookstore: "storefront_layout",
  confectionery: "storefront_layout",
  deli: "bustling_promenade",
  market: "bustling_promenade",
  "movie theater": "modern_architecture",
  billboard: "plastic_billboard",
  "street sign": "plastic_billboard",
  signboard: "plastic_billboard",
  "chainlink fence": "industrial_dumpster",
  barrel: "industrial_dumpster",
  ruin: "shattered_facade",
  paint: "industrial_dumpster",
  "paintbrush": "industrial_dumpster",
  bucket: "industrial_dumpster",
  "hardware store": "industrial_dumpster",
  warehouse: "industrial_dumpster",
};

const PROMENADE_STRONG = new Set([
  "pedestrianized_street",
  "cafe_terrace",
  "bustling_promenade",
]);

const DETR_TO_TOKEN: Record<string, string> = {
  person: "bustling_promenade",
  bench: "pedestrian_plaza",
  "potted plant": "planter_box",
  vase: "planter_box",
  clock: "decorative_lighting",
  umbrella: "cafe_terrace",
  handbag: "bustling_promenade",
};

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/_/g, " ").trim();
}

function resolveToken(label: string): string | null {
  const n = normalizeLabel(label);
  if (IGNORED_VEHICLES.test(n)) return null;
  if (LABEL_TO_TOKEN[n]) return LABEL_TO_TOKEN[n];
  for (const [key, token] of Object.entries(LABEL_TO_TOKEN)) {
    if (n.includes(key)) return token;
  }
  return null;
}

export type LabelWeight = {
  label: string;
  weight: number;
};

function tokenWeight(confidence: number): number {
  if (confidence >= 0.08) return 1;
  if (confidence >= 0.03) return 0.6;
  if (confidence >= 0.015) return 0.35;
  return 0.15;
}

export function classifyMonumationTokens(
  labels: string[],
  labelWeights?: LabelWeight[],
  detrLabels?: string[],
): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  const addToken = (token: string | null) => {
    if (!token || seen.has(token)) return;
    seen.add(token);
    tokens.push(token);
  };

  if (labelWeights?.length) {
    for (const item of labelWeights) {
      addToken(resolveToken(item.label));
    }
  } else {
    for (const label of labels) {
      addToken(resolveToken(label));
    }
  }

  for (const label of detrLabels ?? []) {
    addToken(DETR_TO_TOKEN[label] ?? resolveToken(label));
  }

  return tokens;
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function weightedVectorScore(
  labelWeights: LabelWeight[],
  detrLabels: string[] | undefined,
  set: Set<string>,
): number {
  let sum = 0;
  for (const item of labelWeights) {
    const token = resolveToken(item.label);
    if (!token || !set.has(token)) continue;
    sum += tokenWeight(item.weight);
  }
  for (const label of detrLabels ?? []) {
    const token = DETR_TO_TOKEN[label] ?? resolveToken(label);
    if (token && set.has(token)) sum += 0.5;
  }
  return sum;
}

function countVector(tokens: string[], set: Set<string>): number {
  return tokens.filter((t) => set.has(t)).length;
}

export type MonumationScoreOptions = {
  labelWeights?: LabelWeight[];
  detrLabels?: string[];
  poiBoost?: Partial<Record<RouteMood, number>>;
};

export function poiProximityBoost(
  distanceM: number,
  hasPoi: boolean,
): number {
  if (!hasPoi) return 0;
  if (distanceM <= 50) return 45;
  if (distanceM <= 100) return 35;
  if (distanceM <= 180) return 22;
  if (distanceM <= 280) return 12;
  return 0;
}

export function scoreMonumationNode(
  lat: number,
  lng: number,
  labels: string[],
  options?: MonumationScoreOptions,
): MonumationNode {
  const labelWeights =
    options?.labelWeights ??
    labels.map((label) => ({ label, weight: 0.05 }));
  const detrLabels = options?.detrLabels;

  const tokens = classifyMonumationTokens(labels, labelWeights, detrLabels);

  const heritageN = weightedVectorScore(labelWeights, detrLabels, HERITAGE);
  const scenicN = weightedVectorScore(labelWeights, detrLabels, SCENIC);
  const artsN = weightedVectorScore(labelWeights, detrLabels, ARTS);
  const promenadeN = weightedVectorScore(labelWeights, detrLabels, PROMENADE);
  const pollutionN = countVector(tokens, POLLUTION);

  let heritage_score = clamp(Math.round(heritageN * 28 - pollutionN * 8));
  let scenic_score = clamp(Math.round(scenicN * 28 - pollutionN * 5));
  let art_score = clamp(Math.round(artsN * 28 - pollutionN * 8));
  let promenade_score = clamp(Math.round(promenadeN * 28 - pollutionN * 6));

  const strongPromenade = tokens.some((token) => PROMENADE_STRONG.has(token));
  const weakRetailOnly =
    tokens.includes("storefront_layout") && !strongPromenade;
  if (weakRetailOnly || (pollutionN > 0 && !strongPromenade)) {
    promenade_score = Math.min(promenade_score, 38);
  } else if (!strongPromenade && promenade_score > 45) {
    promenade_score = Math.min(promenade_score, 42);
  }

  const boosts = options?.poiBoost ?? {};
  heritage_score = clamp(heritage_score + (boosts.heritage ?? 0));
  scenic_score = clamp(scenic_score + (boosts.scenic ?? 0));
  art_score = clamp(art_score + (boosts.arts ?? 0));
  promenade_score = clamp(promenade_score + (boosts.promenade ?? 0));

  return {
    lat,
    lng,
    heritage_score,
    scenic_score,
    art_score,
    promenade_score,
    dominant_mood_tag: dominantMoodTag(
      heritage_score,
      scenic_score,
      art_score,
      promenade_score,
    ),
    tokens,
  };
}

/** Pick the best capture heading for the selected mood corridor. */
export function scoreMoodCapture(
  analysis: {
    labelScores: LabelWeight[];
    detrLabels: string[];
  },
  mood: RouteMood,
): number {
  const node = scoreMonumationNode(0, 0, [], {
    labelWeights: analysis.labelScores,
    detrLabels: analysis.detrLabels,
  });
  return scoreForMood(node, mood);
}

/** Pull down promenade when ViT only sees generic retail / street clutter. */
export function capWeakPromenadeFromLabels<
  T extends {
    heritage_score: number;
    scenic_score: number;
    art_score: number;
    promenade_score: number;
    dominant_mood_tag: string;
    visionLabels?: string[];
  },
>(node: T): T {
  if (node.promenade_score <= 42) return node;

  const labels = (node.visionLabels ?? []).join(" ").toLowerCase();
  const strongLife =
    /cafe|restaurant|bakery|market|delicatessen|person|bench|terrace|fountain|plaza|promenade|umbrella/.test(
      labels,
    );
  const weakRetail =
    /paint|hardware|warehouse|industrial|tobacco|signboard|barrel|chainlink|dumpster/.test(
      labels,
    );
  const genericUrban = /street|sidewalk|building|house|shop|store/.test(labels);

  if (!strongLife && (weakRetail || genericUrban)) {
    node.promenade_score = Math.min(node.promenade_score, 35);
    node.dominant_mood_tag = dominantMoodTag(
      node.heritage_score,
      node.scenic_score,
      node.art_score,
      node.promenade_score,
    );
  }

  return node;
}

export function dominantMoodTag(
  heritage: number,
  scenic: number,
  art: number,
  promenade: number,
): string {
  if (heritage < 28 && scenic < 28 && art < 28 && promenade < 28) {
    return "Functional Urban Stretch";
  }
  const scores = [
    { tag: "Monumation Heritage Route", value: heritage },
    { tag: "Monumation Scenic/Green Route", value: scenic },
    { tag: "Monumation Arts & Culture Route", value: art },
    { tag: "Monumation Vibrant Promenade", value: promenade },
  ];
  scores.sort((a, b) => b.value - a.value);
  return scores[0].tag;
}

export function scoreForMood(node: MonumationNode, mood: RouteMood): number {
  switch (mood) {
    case "heritage":
      return node.heritage_score;
    case "scenic":
      return node.scenic_score;
    case "arts":
      return node.art_score;
    case "promenade":
      return node.promenade_score;
  }
}

export function averageMoodScore(nodes: MonumationNode[], mood: RouteMood): number {
  if (!nodes.length) return 0;
  const sum = nodes.reduce((acc, node) => acc + scoreForMood(node, mood), 0);
  return Math.round(sum / nodes.length);
}

export function corridorVerdict(
  streetAverage: number,
  placesScore: number,
  placesFound: number,
  mood: RouteMood,
): string {
  const moodLabel =
    ROUTE_MOODS.find((item) => item.id === mood)?.label ?? mood;

  if (placesFound >= 4 && placesScore >= 55) {
    if (streetAverage < 35) {
      return `${moodLabel}: strong destinations, generic street facades between them — walk for the POIs, not uniform asphalt aesthetics.`;
    }
    return `${moodLabel}: destinations and streetscape both align — high-confidence corridor.`;
  }

  if (placesFound === 0) {
    return `${moodLabel}: few mood-matching places on this path — try a demo corridor or parallel side street.`;
  }

  if (streetAverage < 25 && placesScore < 40) {
    return `${moodLabel}: functional stretch — reroute toward a denser heritage/scenic core.`;
  }

  return `${moodLabel}: mixed corridor — ${placesFound} stops worth visiting along the walk.`;
}

export function moodColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 45) return "#eab308";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}
