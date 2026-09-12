import { resolveModel } from "@copilotkit/runtime/v2";

const priorBaseUrl = process.env.OPENAI_BASE_URL;
process.env.OPENAI_BASE_URL = "https://openrouter.ai/api/v1";

try {
  const model = resolveModel("openai/openai/gpt-5.6-luna", "test-key-never-sent");

  if (model.provider !== "openai.responses") {
    throw new Error("Expected CopilotKit's bundled OpenAI provider, received " + model.provider + ".");
  }
  if (model.modelId !== "openai/gpt-5.6-luna") {
    throw new Error("Expected the OpenRouter model slug to remain intact, received " + model.modelId + ".");
  }
  if (model.specificationVersion === "v4") {
    throw new Error("Resolved an AI SDK v4 model that is incompatible with this CopilotKit runtime.");
  }

  console.log("Provider compatibility check passed: " + model.provider + " " + model.specificationVersion + " → " + model.modelId);
} finally {
  if (priorBaseUrl === undefined) delete process.env.OPENAI_BASE_URL;
  else process.env.OPENAI_BASE_URL = priorBaseUrl;
}
