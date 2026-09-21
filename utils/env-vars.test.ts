import { describe, expect, test } from "bun:test";

const requiredApplicationEnv = {
  APP_API_KEY: "test",
  APP_API_SECRET: "test",
  YNAB_API_KEY: "test",
  YNAB_BUDGET_ID: "test",
};

const validateEnvironment = (environment: Record<string, string>) => {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "-e", 'await import("./utils/env-vars.ts")'],
    cwd: process.cwd(),
    env: environment,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
};

describe("AI environment validation", () => {
  test("requires AI_PROVIDER", () => {
    const result = validateEnvironment(requiredApplicationEnv);
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("AI_PROVIDER");
  });

  test("validates the selected extraction profile", () => {
    const result = validateEnvironment({
      ...requiredApplicationEnv,
      AI_PROVIDER: "openai",
      GEMINI_API_KEY: "configured-but-not-selected",
      GEMINI_MODEL: "gemini-model",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("OPENAI_MODEL");
  });

  test("allows several complete profiles while selecting one", () => {
    const result = validateEnvironment({
      ...requiredApplicationEnv,
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "anthropic-key",
      ANTHROPIC_MODEL: "anthropic-model",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_MODEL: "gemini-model",
    });
    expect(result.exitCode).toBe(0);
  });

  test("requires a separate selected receipt parser profile", () => {
    const result = validateEnvironment({
      ...requiredApplicationEnv,
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_MODEL: "gemini-model",
      RECEIPT_PARSER_PROVIDER: "gemini",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("RECEIPT_PARSER_GEMINI_MODEL");
  });

  test("local parsing requires no LLM parser profile", () => {
    const result = validateEnvironment({
      ...requiredApplicationEnv,
      AI_PROVIDER: "openai-compatible",
      OPENAI_COMPATIBLE_MODEL: "local-model",
      OPENAI_COMPATIBLE_BASE_URL: "http://localhost:11434/v1",
      RECEIPT_PARSER_PROVIDER: "local",
    });
    expect(result.exitCode).toBe(0);
  });
});
