import type { LlmProviderConfig, LlmProviderName } from "./types";

const PROVIDER_ENV_PREFIX: Record<LlmProviderName, string> = {
  gemini: "GEMINI",
  openai: "OPENAI",
  anthropic: "ANTHROPIC",
  "openai-compatible": "OPENAI_COMPATIBLE",
};

export type LlmProfileField = "API_KEY" | "MODEL" | "BASE_URL";

export const getProviderEnvName = (
  provider: LlmProviderName,
  field: LlmProfileField,
  namespace = ""
): string => `${namespace}${PROVIDER_ENV_PREFIX[provider]}_${field}`;

const getOptionalString = (
  source: Record<string, unknown>,
  name: string
): string | undefined => {
  const value = source[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const resolveLlmProviderConfig = (
  source: Record<string, unknown>,
  provider: LlmProviderName,
  namespace = ""
): LlmProviderConfig => {
  const modelName = getProviderEnvName(provider, "MODEL", namespace);
  const model = getOptionalString(source, modelName);
  if (!model) {
    throw new Error(`${modelName} is required for the selected provider`);
  }

  return {
    provider,
    model,
    apiKey: getOptionalString(
      source,
      getProviderEnvName(provider, "API_KEY", namespace)
    ),
    baseUrl: getOptionalString(
      source,
      getProviderEnvName(provider, "BASE_URL", namespace)
    ),
  };
};
