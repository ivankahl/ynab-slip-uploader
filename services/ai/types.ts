export const LLM_PROVIDER_NAMES = [
  "gemini",
  "openai",
  "anthropic",
  "openai-compatible",
] as const;

export type LlmProviderName = (typeof LLM_PROVIDER_NAMES)[number];

export interface LlmProviderConfig {
  provider: LlmProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface BinaryDocument {
  data: Buffer;
  mimeType: string;
}

export interface LlmRequest {
  systemPrompt: string;
  prompt: string;
  documents?: BinaryDocument[];
}

export interface LlmJsonRequest extends LlmRequest {
  jsonSchema: Record<string, unknown>;
  schemaName: string;
}

export interface LlmProvider {
  generateText(request: LlmRequest): Promise<string>;
  generateJson(request: LlmJsonRequest): Promise<unknown>;
}

export interface DocumentParser {
  parse(document: BinaryDocument): Promise<string>;
}
