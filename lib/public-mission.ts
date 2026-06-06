export const MISSION_TAGLINE =
  "Bulan AI transforms public spatial imagery into an automated neighborhood revitalization index — helping municipalities prevent small-business bankruptcies and map localized economic supply gaps with KVKK-compliant, surveillance-free technology.";

export const MISSION_TAGLINE_TR =
  "Kamusal mekân görüntülerini otomatik bir mahalle canlandırma endeksine dönüştürür; belediyelerin esnaf iflaslarını önlemesine ve yerel ekonomik arz boşluklarını %100 KVKK uyumlu şekilde haritalamasına yardımcı olur.";

export const PUBLIC_BENEFIT_PILLARS = [
  {
    id: "esnaf",
    title: "Local economy stability",
    titleTr: "Esnaf koruması",
    description:
      "Steers entrepreneurs away from saturated dead zones, protecting life savings and preventing commercial blight from identical shops crowding one street.",
  },
  {
    id: "municipal",
    title: "Smart city planning",
    titleTr: "Akıllı kent planlama",
    description:
      "Flags neighborhoods missing critical services (electrician, grocery, pharmacy) so planners can target grants, tax breaks, and infrastructure investment.",
  },
  {
    id: "vacancy",
    title: "Activating idle space",
    titleTr: "Atıl alanların kazanımı",
    description:
      "Maps unlisted Kiralık and Satılık banners to reconnect vacant storefronts with new businesses, revenue, and street-level safety.",
  },
  {
    id: "kvkk",
    title: "Privacy by design",
    titleTr: "KVKK uyumlu inovasyon",
    description:
      "Detects inanimate urban objects only — signboards and rental banners. No identity profiling; faces and plates are blurred before any AI processing.",
  },
] as const;

export const KVKK_BADGES = [
  "Signboards only",
  "No person tracking",
  "Face & plate blur",
  "Raw data not stored",
] as const;
