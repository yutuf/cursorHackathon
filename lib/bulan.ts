export type BusinessCategory =
  | "coffee_shop"
  | "electrician"
  | "restaurant"
  | "retail"
  | "barber"
  | "pharmacy"
  | "grocery";

export type OpportunityType =
  | "shop"
  | "competitor"
  | "for_rent"
  | "for_sale"
  | "vacant"
  | "unknown";

export type DetectionResult = {
  objectType: OpportunityType;
  businessCategory: BusinessCategory;
  confidence: number;
  caption?: string;
  signText?: string;
  placesName?: string;
  placesTypes?: string[];
  placesVerified?: boolean;
};

export type OpportunitySummary = {
  vacant: number;
  for_rent: number;
  for_sale: number;
  competitors: number;
  shops: number;
  unknown: number;
  opportunityScore: number;
};

export const BUSINESS_CATEGORIES: Array<{
  id: BusinessCategory;
  label: string;
  keywords: string[];
}> = [
  {
    id: "coffee_shop",
    label: "Coffee shop",
    keywords: ["coffee", "cafe", "kahve", "espresso", "starbucks", "bakery"],
  },
  {
    id: "electrician",
    label: "Electrician",
    keywords: ["electric", "electrician", "elektrik", "electrical", "wiring"],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    keywords: ["restaurant", "restoran", "diner", "food", "kitchen", "lokanta"],
  },
  {
    id: "retail",
    label: "Retail store",
    keywords: ["shop", "store", "market", "butik", "mağaza", "magaza", "retail"],
  },
  {
    id: "barber",
    label: "Barber / salon",
    keywords: ["barber", "berber", "salon", "kuaför", "kuaför", "hair"],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    keywords: ["pharmacy", "eczane", "drugstore", "medical"],
  },
  {
    id: "grocery",
    label: "Grocery",
    keywords: ["grocery", "supermarket", "market", "bakkal", "gıda"],
  },
];

export const OPPORTUNITY_STYLES: Record<
  OpportunityType,
  { label: string; color: string; bg: string; border: string }
> = {
  vacant: {
    label: "Vacant",
    color: "#ca8a04",
    bg: "#fef9c3",
    border: "#fde047",
  },
  for_rent: {
    label: "For rent",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
  },
  for_sale: {
    label: "For sale",
    color: "#ea580c",
    bg: "#ffedd5",
    border: "#fdba74",
  },
  competitor: {
    label: "Competitor",
    color: "#dc2626",
    bg: "#fee2e2",
    border: "#fca5a5",
  },
  shop: {
    label: "Active shop",
    color: "#2563eb",
    bg: "#dbeafe",
    border: "#93c5fd",
  },
  unknown: {
    label: "Unclassified",
    color: "#71717a",
    bg: "#f4f4f5",
    border: "#d4d4d8",
  },
};

const RENT_KEYWORDS = [
  "kiralık",
  "kiralik",
  "for rent",
  "to let",
  "rent",
  "emlak",
  "lease",
];
const SALE_KEYWORDS = [
  "satılık",
  "satilik",
  "for sale",
  "sale",
  "sell",
  "satış",
];
const VACANT_KEYWORDS = [
  "vacant",
  "empty",
  "closed",
  "shutter",
  "boarded",
  "abandoned",
  "derelict",
  "unused",
  "no sign",
  "graffiti",
  "broken window",
  "damaged building",
];

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function containsKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function getCategoryKeywords(category: BusinessCategory): string[] {
  return (
    BUSINESS_CATEGORIES.find((item) => item.id === category)?.keywords ?? []
  );
}

export type LabelScore = {
  label: string;
  score: number;
};

export type StorefrontClassificationInput = {
  caption: string;
  labelScores?: LabelScore[];
  detrLabels?: string[];
  signText?: string;
  businessCategory: BusinessCategory;
};

/** ImageNet labels that ViT over-predicts on Street View — never treat as shops. */
const UNRELIABLE_VIT_LABELS = [
  "tobacco shop",
  "tobacco",
  "convenience store",
  "grocery store",
  "bookshop",
  "bookstore",
  "shop",
  "store",
  "market",
  "restaurant",
  "bakery",
  "barbershop",
  "pharmacy",
  "drugstore",
];

const NON_STOREFRONT_SCENE_LABELS = [
  "mosque",
  "palace",
  "monastery",
  "triumphal arch",
  "fountain",
  "obelisk",
  "pedestal",
  "bell cote",
  "vault",
  "chainlink fence",
  "fence",
  "stone wall",
  "wall",
  "brick",
  "rail",
  "bench",
  "seashore",
  "promontory",
  "patio",
  "sundial",
  "megalith",
  "cliff",
  "pier",
];

const MIN_VIT_LABEL_CONFIDENCE = 0.12;

const STOREFRONT_TYPE_LABELS: Record<BusinessCategory, string[]> = {
  coffee_shop: ["coffee", "espresso", "cafe"],
  electrician: ["hardware", "tool"],
  restaurant: ["restaurant", "bakery", "delicatessen", "buffet", "diner"],
  retail: ["bookshop", "library", "shoe", "confectionery", "store"],
  barber: ["barbershop", "barber"],
  pharmacy: ["pharmacy", "drugstore", "chemist"],
  grocery: ["grocery", "supermarket", "confectionery", "market"],
};

const VEHICLE_DOMINANCE_LABELS = [
  "ambulance",
  "minivan",
  "minibus",
  "van",
  "wagon",
  "truck",
  "police",
  "moving van",
  "garbage truck",
  "fire engine",
  "limousine",
  "jeep",
  "convertible",
  "sports car",
  "pickup",
  "parking meter",
];

const DETR_ONLY_OBJECT_LABELS = new Set([
  "person",
  "car",
  "truck",
  "bus",
  "motorcycle",
  "bench",
  "bird",
  "traffic light",
  "fire hydrant",
]);

function isVehicleDominated(labelScores: LabelScore[]): boolean {
  const top = labelScores.slice(0, 8);
  const vehicleHits = top.filter((item) =>
    VEHICLE_DOMINANCE_LABELS.some((vehicle) =>
      item.label.toLowerCase().includes(vehicle),
    ),
  ).length;

  return vehicleHits >= 5;
}

function isUnreliableVitLabel(label: string): boolean {
  const normalized = normalizeText(label);
  return UNRELIABLE_VIT_LABELS.some((blocked) =>
    normalized.includes(normalizeText(blocked)),
  );
}

function isNonStorefrontScene(
  labelScores: LabelScore[],
  detrLabels: string[],
): boolean {
  const top = labelScores[0];
  if (top && top.score >= 0.2) {
    const normalized = normalizeText(top.label);
    if (
      NON_STOREFRONT_SCENE_LABELS.some((scene) =>
        normalized.includes(normalizeText(scene)),
      )
    ) {
      return true;
    }
  }

  if (detrLabels.length > 0) {
    const onlyStreetObjects = detrLabels.every((label) =>
      DETR_ONLY_OBJECT_LABELS.has(label),
    );
    if (onlyStreetObjects) return true;
  }

  return false;
}

function matchCategoryInText(
  text: string,
  businessCategory: BusinessCategory,
): string | undefined {
  const keywords = [
    ...getCategoryKeywords(businessCategory),
    ...STOREFRONT_TYPE_LABELS[businessCategory],
  ];

  return extractSignHint(text, keywords);
}

function matchCategoryInLabels(
  labelScores: LabelScore[],
  businessCategory: BusinessCategory,
): { label: string; score: number } | null {
  const keywords = [
    ...getCategoryKeywords(businessCategory),
    ...STOREFRONT_TYPE_LABELS[businessCategory],
  ];

  for (const item of labelScores) {
    if (item.score < MIN_VIT_LABEL_CONFIDENCE) break;
    if (isUnreliableVitLabel(item.label)) continue;

    const normalized = normalizeText(item.label);
    const hit = keywords.find((keyword) =>
      normalized.includes(normalizeText(keyword)),
    );

    if (hit) {
      return { label: item.label, score: item.score };
    }
  }

  return null;
}

function buildCombinedText(input: StorefrontClassificationInput): string {
  return [
    input.caption,
    input.signText,
    ...(input.labelScores ?? []).map((item) => item.label),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function classifyStorefront(
  input: StorefrontClassificationInput,
): DetectionResult {
  const {
    caption,
    labelScores = [],
    detrLabels = [],
    signText,
    businessCategory,
  } = input;
  const combinedText = buildCombinedText(input);

  if (!combinedText) {
    return {
      objectType: "unknown",
      businessCategory,
      confidence: 0.2,
      caption,
      signText,
    };
  }

  const topLabel = labelScores[0];
  if (
    isNonStorefrontScene(labelScores, detrLabels) ||
    (topLabel &&
      topLabel.score >= 0.15 &&
      isUnreliableVitLabel(topLabel.label))
  ) {
    return {
      objectType: "unknown",
      businessCategory,
      confidence: 0.5,
      caption,
      signText,
    };
  }

  if (containsKeyword(combinedText, RENT_KEYWORDS)) {
    return {
      objectType: "for_rent",
      businessCategory,
      confidence: signText ? 0.9 : 0.82,
      caption,
      signText: extractSignHint(combinedText, RENT_KEYWORDS) ?? signText,
    };
  }

  if (containsKeyword(combinedText, SALE_KEYWORDS)) {
    return {
      objectType: "for_sale",
      businessCategory,
      confidence: signText ? 0.88 : 0.8,
      caption,
      signText: extractSignHint(combinedText, SALE_KEYWORDS) ?? signText,
    };
  }

  if (containsKeyword(combinedText, VACANT_KEYWORDS)) {
    return {
      objectType: "vacant",
      businessCategory,
      confidence: 0.76,
      caption,
      signText,
    };
  }

  const signMatch = signText ? matchCategoryInText(signText, businessCategory) : undefined;
  if (signMatch) {
    return {
      objectType: "competitor",
      businessCategory,
      confidence: 0.92,
      caption,
      signText: signMatch,
    };
  }

  const labelMatch = matchCategoryInLabels(labelScores, businessCategory);
  if (labelMatch) {
    return {
      objectType: "competitor",
      businessCategory,
      confidence: Math.min(0.9, 0.68 + labelMatch.score),
      caption,
      signText: labelMatch.label,
    };
  }

  if (
    signText &&
    containsKeyword(combinedText, getCategoryKeywords(businessCategory))
  ) {
    return {
      objectType: "competitor",
      businessCategory,
      confidence: 0.88,
      caption,
      signText: matchCategoryInText(combinedText, businessCategory),
    };
  }

  if (isVehicleDominated(labelScores)) {
    return {
      objectType: "unknown",
      businessCategory,
      confidence: 0.4,
      caption,
      signText,
    };
  }

  return {
    objectType: "unknown",
    businessCategory,
    confidence: 0.35,
    caption,
    signText,
  };
}

export function classifyFromCaption(
  caption: string,
  businessCategory: BusinessCategory,
): DetectionResult {
  return classifyStorefront({ caption, businessCategory });
}

export function summarizeOpportunities(
  detections: DetectionResult[],
): OpportunitySummary {
  const counts = {
    vacant: 0,
    for_rent: 0,
    for_sale: 0,
    competitors: 0,
    shops: 0,
    unknown: 0,
  };

  for (const detection of detections) {
    switch (detection.objectType) {
      case "vacant":
        counts.vacant += 1;
        break;
      case "for_rent":
        counts.for_rent += 1;
        break;
      case "for_sale":
        counts.for_sale += 1;
        break;
      case "competitor":
        counts.competitors += 1;
        break;
      case "shop":
        counts.shops += 1;
        break;
      default:
        counts.unknown += 1;
    }
  }

  const openings = counts.vacant + counts.for_rent + counts.for_sale;
  const competitionPenalty = counts.competitors * 8;
  const openingBonus = openings * 15;
  const opportunityScore = Math.max(
    0,
    Math.min(100, 40 + openingBonus - competitionPenalty),
  );

  return {
    ...counts,
    opportunityScore: Math.round(opportunityScore),
  };
}

function extractSignHint(text: string, keywords: string[]): string | undefined {
  const normalized = normalizeText(text);
  const match = keywords.find((keyword) =>
    normalized.includes(normalizeText(keyword)),
  );
  return match;
}
