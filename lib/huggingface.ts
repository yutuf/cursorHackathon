const HF_ROUTER = "https://router.huggingface.co/hf-inference/models";
const VIT_MODEL = "google/vit-base-patch16-224";
const DETR_MODEL = "facebook/detr-resnet-50";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export type StorefrontAnalysis = {
  caption: string;
  labels: string[];
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

function buildCaption(vit: VitResult, detr: DetrResult): string {
  const topLabels = vit
    .slice(0, 5)
    .map((item) => item.label.replace(/_/g, " "))
    .join(", ");

  const objects = detr
    .filter((item) => item.score > 0.5)
    .slice(0, 6)
    .map((item) => item.label)
    .join(", ");

  const parts = [`street scene with ${topLabels}`];
  if (objects) parts.push(`visible objects: ${objects}`);
  return parts.join("; ");
}

export async function analyzeStorefrontImage(
  imageBase64: string,
): Promise<StorefrontAnalysis | null> {
  const buffer = imageBuffer(imageBase64);

  const [vit, detr] = await Promise.all([
    queryRouter<VitResult>(VIT_MODEL, buffer, "application/octet-stream"),
    queryRouter<DetrResult>(DETR_MODEL, buffer, "image/jpeg"),
  ]);

  if (!vit?.length) return null;

  const labels = vit.map((item) => item.label.replace(/_/g, " "));
  const vehicleCount = detr ? countForegroundVehicles(detr) : 0;

  return {
    caption: buildCaption(vit, detr ?? []),
    labels,
    vehicleCount,
    provider: "huggingface-router",
  };
}

export async function captionStreetViewImage(
  imageBase64: string,
): Promise<string | null> {
  const analysis = await analyzeStorefrontImage(imageBase64);
  return analysis?.caption ?? null;
}

export function scoreCaptureQuality(analysis: StorefrontAnalysis): number {
  const labelText = analysis.labels.join(" ").toLowerCase();
  let score = 50;

  if (analysis.vehicleCount === 0) score += 30;
  else score -= analysis.vehicleCount * 15;

  if (
    /store|shop|restaurant|pharmacy|barber|cafe|market|library|bookshop|bakery/.test(
      labelText,
    )
  ) {
    score += 20;
  }

  if (/road|street|alley|sidewalk|building|house/.test(labelText)) {
    score += 10;
  }

  return score;
}
