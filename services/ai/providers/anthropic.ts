import Anthropic from "@anthropic-ai/sdk";
import type {
  LlmJsonRequest,
  LlmProvider,
  LlmProviderConfig,
  LlmRequest,
} from "../types";
import {
  DEFAULT_LLM_TEMPERATURE,
  parseJsonResponse,
  withJsonInstructions,
} from "./helpers";

const toAnthropicMediaType = (
  mimeType: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" => {
  if (mimeType === "image/jpg") return "image/jpeg";
  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/gif" ||
    mimeType === "image/webp"
  ) {
    return mimeType;
  }
  throw new Error(`Anthropic does not support image type ${mimeType}`);
};

export class AnthropicProvider implements LlmProvider {
  private readonly client: Anthropic;

  constructor(private readonly config: LlmProviderConfig) {
    if (!config.apiKey) throw new Error("Anthropic requires an API key");
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  generateText(request: LlmRequest): Promise<string> {
    return this.generate(request);
  }

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    const text = await this.generate(
      {
        ...request,
        prompt: withJsonInstructions(request.prompt, request.jsonSchema),
      },
      { type: "json_schema", schema: request.jsonSchema }
    );
    return parseJsonResponse(text);
  }

  private async generate(
    request: LlmRequest,
    outputFormat?: Anthropic.Messages.JSONOutputFormat
  ): Promise<string> {
    const content: Anthropic.Messages.ContentBlockParam[] = [
      ...(request.documents ?? []).map((document) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: toAnthropicMediaType(document.mimeType),
          data: document.data.toString("base64"),
        },
      })),
      { type: "text", text: request.prompt },
    ];

    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 16_384,
      temperature: DEFAULT_LLM_TEMPERATURE,
      system: request.systemPrompt,
      messages: [{ role: "user", content }],
      ...(outputFormat
        ? { output_config: { format: outputFormat } }
        : {}),
    });

    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
    if (!text) throw new Error("Anthropic returned no text content");
    return text;
  }
}
