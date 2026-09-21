import type { LlmProvider, LlmProviderConfig } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { OpenAiProvider } from "./providers/openai";

export const createLlmProvider = (
  config: LlmProviderConfig
): LlmProvider => {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider(config);
    case "openai":
      return new OpenAiProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "openai-compatible":
      return new OpenAiProvider(config, true);
  }
};
