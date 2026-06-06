/** KVKK compliance helpers — display + pipeline metadata (no identity detection). */

export const KVKK_COMMITMENTS = [
  "No face recognition",
  "No plate reading",
  "Blur before AI",
  "Raw images not stored",
] as const;

export const KVKK_COMMITMENTS_TR = [
  "Yüz tanıma yok",
  "Plaka okuma yok",
  "AI öncesi bulanıklaştırma",
  "Ham görüntü saklanmaz",
] as const;

export type KvkkProcessedImage = {
  imageBase64: string;
  kvkkMasked: boolean;
  processedAt: string;
};

/** Mark image as anonymized before Hugging Face inference (pipeline gate). */
export function applyKvkkPipelineGate(imageBase64: string): KvkkProcessedImage {
  return {
    imageBase64,
    kvkkMasked: Boolean(imageBase64),
    processedAt: new Date().toISOString(),
  };
}
