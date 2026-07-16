export type LustifyGenerateResult = {
  imageDataUrl: string;
};

export async function generateLustifyImage(prompt: string): Promise<LustifyGenerateResult> {
  const res = await fetch("/.netlify/functions/lustify-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || "LUSTIFY_GENERATION_FAILED");
  }
  if (!data.imageUrl) throw new Error("No image returned");

  return { imageDataUrl: data.imageUrl };
}
