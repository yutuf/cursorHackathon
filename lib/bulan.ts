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

export function classifyFromCaption(
  caption: string,
  businessCategory: BusinessCategory,
): DetectionResult {
  const text = caption.trim();

  if (!text) {
    return {
      objectType: "unknown",
      businessCategory,
      confidence: 0.2,
      caption: text,
    };
  }

  if (containsKeyword(text, RENT_KEYWORDS)) {
    return {
      objectType: "for_rent",
      businessCategory,
      confidence: 0.82,
      caption: text,
      signText: extractSignHint(text, RENT_KEYWORDS),
    };
  }

  if (containsKeyword(text, SALE_KEYWORDS)) {
    return {
      objectType: "for_sale",
      businessCategory,
      confidence: 0.8,
      caption: text,
      signText: extractSignHint(text, SALE_KEYWORDS),
    };
  }

  if (containsKeyword(text, VACANT_KEYWORDS)) {
    return {
      objectType: "vacant",
      businessCategory,
      confidence: 0.76,
      caption: text,
    };
  }

  const categoryKeywords = getCategoryKeywords(businessCategory);
  if (businessCategory === "pharmacy" && containsKeyword(text, ["pharmacy", "drugstore", "eczane"])) {
    return {
      objectType: "competitor",
      businessCategory,
      confidence: 0.8,
      caption: text,
      signText: "pharmacy",
    };
  }

  if (containsKeyword(text, categoryKeywords)) {
    return {
      objectType: "competitor",
      businessCategory,
      confidence: 0.74,
      caption: text,
      signText: extractSignHint(text, categoryKeywords),
    };
  }

  const shopSignals = [
    "store",
    "shop",
    "sign",
    "storefront",
    "business",
    "restaurant",
    "office",
    "building with",
    "facade",
    "awning",
    "display",
    "window",
    "pharmacy",
    "drugstore",
    "library",
    "bookshop",
    "bakery",
    "barbershop",
    "salon",
    "market",
    "tobacco",
    "grocery",
    "street scene",
    "visible objects",
  ];

  if (containsKeyword(text, shopSignals)) {
    return {
      objectType: "shop",
      businessCategory,
      confidence: 0.62,
      caption: text,
    };
  }

  return {
    objectType: "unknown",
    businessCategory,
    confidence: 0.35,
    caption: text,
  };
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
