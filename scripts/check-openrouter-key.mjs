import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const key = process.env.OPENROUTER_API_KEY?.trim();

if (!key) {
  console.error("OPENROUTER_API_KEY is missing from .env.local.");
  process.exit(1);
}

if (/^sk-or-v1-[a-f\d]{63}$/i.test(key)) {
  console.error(
    "OPENROUTER_API_KEY is truncated: found 63 characters after sk-or-v1-, expected 64. Copy the complete key into .env.local.",
  );
  process.exit(1);
}

const response = await fetch("https://openrouter.ai/api/v1/key", {
  headers: { Authorization: `Bearer ${key}` },
});

if (!response.ok) {
  let detail = "";
  try {
    const body = await response.json();
    detail = body?.error?.message ? `: ${body.error.message}` : "";
  } catch {
    // Keep the diagnostic useful even if the provider returns a non-JSON body.
  }

  console.error(`OpenRouter rejected the configured key (${response.status})${detail}.`);
  process.exit(1);
}

const body = await response.json();
const remaining = body?.data?.limit_remaining;
console.log(
  `OpenRouter key is valid${typeof remaining === "number" ? `; $${remaining.toFixed(2)} remains on its limit` : ""}.`,
);
