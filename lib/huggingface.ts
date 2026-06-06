const HF_ROUTER = "https://router.huggingface.co/hf-inference/models";
const VIT_MODEL = "google/vit-base-patch16-224";
const DETR_MODEL = "facebook/detr-resnet-50";
const OCR_MODEL = "microsoft/trocr-base-printed";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export type LabelScore = {
  label: string;
  score: number;
};

export type StorefrontAnalysis = {
  caption: string;
  labels: string[];
  labelScores: LabelScore[];
  detrLabels: string[];
  signText?: string;
  vehicleCount: number;
  provider: "huggingface-router";
};

type VitResult = Array<{ label: string; score: number }>;
type DetrResult = Array<{
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}>;

function getToken(): string | null {
  return process.env.HUGGINGFACE_API_KEY ?? null;
}

function imageBuffer(imageBase64: string): Buffer {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryRouter<T>(
  model: string,
  buffer: Buffer,
  contentType: string,
): Promise<T | null> {
  const token = getToken();
  if (!token) return null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${HF_ROUTER}/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
        },
        body: new Uint8Array(buffer),
      });

      if (response.status === 503 && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      if (!response.ok) return null;

      return (await response.json()) as T;
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  return null;
}

function countForegroundVehicles(
  detections: DetrResult,
  imageSize = 640,
): number {
  const vehicleLabels = new Set(["car", "truck", "bus", "motorcycle"]);
  const centerX = imageSize / 2;
  const centerY = imageSize / 2;

  return detections.filter((item) => {
    if (!vehicleLabels.has(item.label) || item.score < 0.45) return false;
    const box = item.box;
    const boxCenterX = (box.xmin + box.xmax) / 2;
    const boxCenterY = (box.ymin + box.ymax) / 2;
    const dist = Math.hypot(boxCenterX - centerX, boxCenterY - centerY);
    return dist < imageSize * 0.35;
  }).length;
}

const STOREFRONT_LABEL_PATTERN =
  /pharmacy|drugstore|chemist|eczane|shop|store|restaurant|barber|cafe|market|grocery|bookshop|bakery|confectionery|delicatessen/i;

export type QuickStorefrontAnalysis = {
  caption: string;
  labels: string[];
  labelScores: LabelScore[];
  detrLabels: string[];
  vehicleCount: number;
};

function normalizeVitLabel(label: string): string {
  return label.replace(/_/g, " ");
}

function buildCaption(
  vit: VitResult,
  detr: DetrResult,
  signText?: string,
): string {
  const topLabels = vit
    .slice(0, 5)
    .map((item) => normalizeVitLabel(item.label))
    .join(", ");

  const storefrontCues = vit
    .filter((item) => STOREFRONT_LABEL_PATTERN.test(item.label))
    .slice(0, 4)
    .map((item) => normalizeVitLabel(item.label))
    .join(", ");

  const objects = detr
    .filter((item) => item.score > 0.5)
    .slice(0, 6)
    .map((item) => item.label)
    .join(", ");

  const parts = [`scene labels: ${topLabels}`];
  if (storefrontCues) parts.push(`storefront cues: ${storefrontCues}`);
  if (signText?.trim()) parts.push(`sign text: ${signText.trim()}`);
  if (objects) parts.push(`visible objects: ${objects}`);
  return parts.join("; ");
}

async function extractSignText(buffer: Buffer): Promise<string | undefined> {
  const result = await queryRouter<Array<{ generated_text?: string }> | { generated_text?: string }>(
    OCR_MODEL,
    buffer,
    "image/jpeg",
  );

  if (!result) return undefined;

  const text = Array.isArray(result)
    ? result[0]?.generated_text
    : result.generated_text;

  const cleaned = text?.trim();
  return cleaned || undefined;
}

async function analyzeQuickFromBuffer(
  buffer: Buffer,
): Promise<QuickStorefrontAnalysis | null> {
  const [vit, detr] = await Promise.all([
    queryRouter<VitResult>(VIT_MODEL, buffer, "application/octet-stream"),
    queryRouter<DetrResult>(DETR_MODEL, buffer, "image/jpeg"),
  ]);

  if (!vit?.length) return null;

  const labelScores = vit.map((item) => ({
    label: normalizeVitLabel(item.label),
    score: item.score,
  }));

  const detrLabels = (detr ?? [])
    .filter((item) => item.score > 0.45)
    .map((item) => item.label);

  return {
    caption: buildCaption(vit, detr ?? []),
    labels: labelScores.map((item) => item.label),
    labelScores,
    detrLabels,
    vehicleCount: detr ? countForegroundVehicles(detr) : 0,
  };
}

/** Fast ViT + DETR pass for capture-side selection (no OCR). */
export async function analyzeStorefrontQuick(
  imageBase64: string,
): Promise<QuickStorefrontAnalysis | null> {
  return analyzeQuickFromBuffer(imageBuffer(imageBase64));
}

/** Full analysis with sign OCR — run once on the winning capture. */
export async function analyzeStorefrontImage(
  imageBase64: string,
  quick?: QuickStorefrontAnalysis,
): Promise<StorefrontAnalysis | null> {
  const buffer = imageBuffer(imageBase64);
  const base = quick ?? (await analyzeQuickFromBuffer(buffer));
  if (!base) return null;

  const signText = await extractSignText(buffer);
  const caption = signText
    ? `${base.caption}; sign text: ${signText.trim()}`
    : base.caption;

  return {
    caption,
    labels: base.labels,
    labelScores: base.labelScores,
    detrLabels: base.detrLabels,
    signText,
    vehicleCount: base.vehicleCount,
    provider: "huggingface-router",
  };
}

export async function captionStreetViewImage(
  imageBase64: string,
): Promise<string | null> {
  const analysis = await analyzeStorefrontImage(imageBase64);
  return analysis?.caption ?? null;
}

export function scoreCaptureQuality(
  analysis: Pick<
    StorefrontAnalysis,
    "labelScores" | "vehicleCount" | "signText"
  >,
): number {
  let score = 50;

  if (analysis.vehicleCount === 0) score += 30;
  else score -= analysis.vehicleCount * 15;

  const hasStorefrontLabel = analysis.labelScores.some(
    (item) =>
      item.score >= 0.03 && STOREFRONT_LABEL_PATTERN.test(item.label),
  );
  if (hasStorefrontLabel) score += 20;

  if (analysis.signText && STOREFRONT_LABEL_PATTERN.test(analysis.signText)) {
    score += 25;
  }

  if (
    analysis.labelScores.some(
      (item) =>
        item.score >= 0.03 &&
        /road|street|alley|sidewalk|building|house/.test(item.label),
    )
  ) {
    score += 10;
  }

  return score;
}
