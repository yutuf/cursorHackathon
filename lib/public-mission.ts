export const MISSION_TAGLINE =
  "Monumation scores walking routes by mood anywhere Google Maps works — heritage, green scenic, arts, and promenade corridors — using Places, Street View, and Hugging Face vision.";

export const MISSION_TAGLINE_TR =
  "Monumation, Google Haritalar'ın olduğu her yerde yürüyüş koridorlarını ruh haline göre puanlar: tarihi, yeşil, sanat ve canlı yaşam — Places, Street View ve Hugging Face ile.";

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
      "Uses Google Street View and Places imagery (already face- and plate-blurred). No identity profiling or raw image storage.",
  },
] as const;

export const KVKK_BADGES = [
  "Landmarks only",
  "No person tracking",
  "Google-censored imagery",
  "Data deleted post-event",
] as const;

export const DEMO_STEPS = [
  "Pick Heritage mood → click Compare Heritage Route",
  "Show good corridor score vs weak stretch",
  "Demo: Sultanahmet → Eminönü → Scan mood corridor",
  "Point at Places photo with Hugging Face score",
  "Mention Monumation Engine (Go) + KVKK mask on Street View",
] as const;
