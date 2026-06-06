const BLIP_MODEL = "Salesforce/blip-image-captioning-base";

export async function captionStreetViewImage(
  imageBase64: string,
): Promise<string | null> {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) return null;

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${BLIP_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
      },
    );

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as Array<{ generated_text?: string }>;
    return body[0]?.generated_text?.trim() ?? null;
  } catch {
    return null;
  }
}
