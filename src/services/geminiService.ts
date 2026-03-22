export interface CaptionOptions {
  tone: string;
  platform: string;
  additionalContext?: string;
  language: string;
}

export interface Caption {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}

export interface CaptionResponse {
  captions?: Caption[];
  text?: string;
  isRaw: boolean;
}

export async function generateCaptions(
  imageData: string,
  _mimeType: string,
  options: CaptionOptions
): Promise<CaptionResponse> {
  const response = await fetch("/api/generate-captions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageData, options }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate captions");
  }

  return await response.json();
}
