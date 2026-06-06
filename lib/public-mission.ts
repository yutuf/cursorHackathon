export const MISSION_TAGLINE =
  "Monumation routes Istanbul pedestrians by mood — heritage, green scenic, arts, and promenade corridors — using Google Places and Hugging Face vision with KVKK-compliant, surveillance-free processing.";

export const MISSION_TAGLINE_TR =
  "Monumation, İstanbul'da yürüyüşü ruh haline göre yönlendirir: tarihi koridor, yeşil manzara, sanat ve canlı yaşam — Google Places ve Hugging Face ile, KVKK uyumlu ve gözetimsiz.";

export const PUBLIC_BENEFIT_PILLARS = [
  {
    id: "culture",
    title: "Cultural corridor routing",
    titleTr: "Kültürel koridor yönlendirme",
    description:
      "Steers foot traffic toward heritage and arts paths instead of overcrowding single landmarks or random arterials.",
  },
  {
    id: "local",
    title: "Local commerce",
    titleTr: "Yerel esnaf",
    description:
      "Promenade mood surfaces café streets, bazaars, and pedestrian life — bringing visitors to neighborhood businesses.",
  },
  {
    id: "sustainable",
    title: "Sustainable tourism",
    titleTr: "Sürdürülebilir turizm",
    description:
      "Corridor battle scoring shows why some walks feel right and others don't — reducing aimless asphalt wandering.",
  },
  {
    id: "kvkk",
    title: "Privacy by design",
    titleTr: "KVKK uyumlu inovasyon",
    description:
      "Vision on places and streetscape only. Faces and plates anonymized before AI. No identity profiling.",
  },
] as const;

export const KVKK_BADGES = [
  "Landmarks only",
  "No person tracking",
  "Face & plate blur",
  "Data deleted post-event",
] as const;

export const DEMO_STEPS = [
  "Pick Heritage mood → click Compare Heritage Route",
  "Show good corridor score vs weak stretch",
  "Demo: Sultanahmet → Eminönü → Scan mood corridor",
  "Point at Places photo with Hugging Face score",
  "Mention Monumation Engine (Go) + KVKK mask on Street View",
] as const;
