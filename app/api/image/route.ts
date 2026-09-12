import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      title?: string;
      year?: string;
      passage?: string;
    };

    if (!body.prompt?.trim()) {
      return Response.json({ error: "An illustration prompt is required." }, { status: 400 });
    }
    const passage = body.passage?.slice(0, 2800) || "No passage supplied";
    const prompt = `Create a richly observed book illustration for ${body.title || "this book"}${body.year ? ` (${body.year})` : ""}.

Reader request: ${body.prompt}

Passage evidence:
${passage}

Style: atmospheric editorial illustration, historically plausible materials and lighting, restrained warm palette, fine ink and painterly gouache texture, no typography, no captions, no modern objects. Treat unspecified details as subtle rather than definitive. Square composition.`;

    const imageProvider = process.env.IMAGE_PROVIDER || process.env.AI_PROVIDER || "openai";
    if (imageProvider === "openrouter") {
      if (!process.env.OPENROUTER_API_KEY) {
        return Response.json({ error: "OPENROUTER_API_KEY is missing." }, { status: 500 });
      }

      const response = await fetch("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-OpenRouter-Title": "Marginalia Reader",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_IMAGE_MODEL || "openai/gpt-image-1",
          prompt,
          size: "1024x1024",
          quality: "low",
        }),
      });
      const data = (await response.json()) as {
        data?: Array<{ b64_json?: string; media_type?: string }>;
        error?: { message?: string } | string;
      };
      if (!response.ok) {
        const detail = typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(detail || "OpenRouter image generation failed.");
      }
      const output = data.data?.[0];
      if (!output?.b64_json) throw new Error("OpenRouter returned no image.");

      return Response.json({
        kind: "generated",
        title: body.prompt,
        caption: "An interpretive illustration grounded in the visible passage. Details not stated by the author are artistic inference.",
        imageUrl: `data:${output.media_type || "image/png"};base64,${output.b64_json}`,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const image = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      prompt,
      size: "1024x1024",
      quality: "low",
    });

    const first = image.data?.[0];
    const imageUrl = first?.b64_json
      ? `data:image/png;base64,${first.b64_json}`
      : first?.url;

    if (!imageUrl) throw new Error("The image provider returned no image.");

    return Response.json({
      kind: "generated",
      title: body.prompt,
      caption: "An interpretive illustration grounded in the visible passage. Details not stated by the author are artistic inference.",
      imageUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
