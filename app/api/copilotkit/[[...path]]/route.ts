import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READER_PROMPT = `You are Marginalia, a perceptive reading companion who lives inside a book reader.

The app supplies the current book metadata, exact visible passage, nearby chapter text, selected text, reading location, and progress. Treat that context as the source of truth. Never reveal events after the supplied reading position, even if you know the book.

Write with the warmth and precision of an excellent museum guide. Keep the first answer concise (normally 2–4 short paragraphs), then invite a useful follow-up. Distinguish details stated by the text from reasonable interpretation. If context is missing, say exactly what is missing.

You have two visual tools:
- illustrate_book_scene: call this whenever the reader asks to imagine, picture, see, visualize, or illustrate a scene. Create a historically and textually grounded prompt. Do not invent named characters or important objects absent from the supplied passage. After calling it, briefly explain three visual details and their textual basis.
- find_historical_reference: call this for unfamiliar physical objects, clothing, buildings, vehicles, tools, or historical practices when a real reference image would help. Use a precise, era-aware search query. Explain what a contemporary reader would already have known.

For difficult prose or philosophy, explain the passage in plain language, then connect the explanation back to one short phrase from the visible text. Do not call a visual tool unless it improves comprehension.`;

function makeAgent() {
  if (process.env.AI_PROVIDER === "openrouter") {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("AI_PROVIDER is openrouter but OPENROUTER_API_KEY is missing.");
    }

    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return new BuiltInAgent({
      // CopilotKit currently bundles AI SDK v6 while the latest OpenRouter provider
      // exposes the v7 model shape. The runtime-compatible surface is structural.
      model: openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini") as never,
      prompt: READER_PROMPT,
      maxSteps: 3,
      maxOutputTokens: 900,
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const modelName = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
  return new BuiltInAgent({
    model: `openai/${modelName}`,
    apiKey: process.env.OPENAI_API_KEY,
    prompt: READER_PROMPT,
    maxSteps: 3,
    maxOutputTokens: 900,
  });
}

const copilotRuntime = new CopilotRuntime({
  agents: { reader: makeAgent() },
  telemetryProperties: { app: "marginalia-reader" },
});

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
  mode: "multi-route",
  activateChannels: false,
});

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
