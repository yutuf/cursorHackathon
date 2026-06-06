/** KVKK compliance helpers — display + pipeline metadata (no identity detection). */

export const KVKK_COMMITMENTS = [
  "No face recognition",
  "No plate reading",
  "Google-censored imagery only",
  "Raw images not stored",
] as const;

export const KVKK_COMMITMENTS_TR = [
  "Yüz tanıma yok",
  "Plaka okuma yok",
  "Google'ın sansürlü görüntüleri",
  "Ham görüntü saklanmaz",
] as const;

export type KvkkProcessedImage = {
  imageBase64: string;
  kvkkMasked: boolean;
  processedAt: string;
};

/** Pipeline metadata — imagery is already censored by Google before inference. */
export function applyKvkkPipelineGate(imageBase64: string): KvkkProcessedImage {
  return {
    imageBase64,
    kvkkMasked: false,
    processedAt: new Date().toISOString(),
  };
}
