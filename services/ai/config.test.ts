import { describe, expect, test } from "bun:test";
import { resolveLlmProviderConfig } from "./config";

const profiles = {
  GEMINI_API_KEY: "gemini-key",
  GEMINI_MODEL: "gemini-model",
  GEMINI_BASE_URL: "https://gemini.example",
  OPENAI_API_KEY: "openai-key",
  OPENAI_MODEL: "openai-model",
  OPENAI_BASE_URL: "https://openai.example/v1",
  ANTHROPIC_API_KEY: "anthropic-key",
  ANTHROPIC_MODEL: "anthropic-model",
  ANTHROPIC_BASE_URL: "https://anthropic.example",
  OPENAI_COMPATIBLE_API_KEY: "compatible-key",
  OPENAI_COMPATIBLE_MODEL: "compatible-model",
  OPENAI_COMPATIBLE_BASE_URL: "https://compatible.example/v1",
  RECEIPT_PARSER_OPENAI_API_KEY: "parser-key",
  RECEIPT_PARSER_OPENAI_MODEL: "parser-model",
  RECEIPT_PARSER_OPENAI_BASE_URL: "https://parser.example/v1",
};

describe("resolveLlmProviderConfig", () => {
  test("selects one extraction profile when several are configured", () => {
    expect(resolveLlmProviderConfig(profiles, "anthropic")).toEqual({
      provider: "anthropic",
      apiKey: "anthropic-key",
      model: "anthropic-model",
      baseUrl: "https://anthropic.example",
    });
  });

  test("selects a separate receipt parser profile", () => {
    expect(
      resolveLlmProviderConfig(profiles, "openai", "RECEIPT_PARSER_")
    ).toEqual({
      provider: "openai",
      apiKey: "parser-key",
      model: "parser-model",
      baseUrl: "https://parser.example/v1",
    });
  });

  test("reports the selected profile variable when its model is absent", () => {
    expect(() => resolveLlmProviderConfig({}, "gemini")).toThrow(
      "GEMINI_MODEL is required"
    );
  });
});
