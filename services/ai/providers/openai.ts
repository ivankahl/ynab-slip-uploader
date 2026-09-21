import OpenAI from "openai";
import type {
  LlmJsonRequest,
  LlmProvider,
  LlmProviderConfig,
  LlmRequest,
} from "../types";
import { parseJsonResponse, withJsonInstructions } from "./helpers";

export class OpenAiProvider implements LlmProvider {
  private readonly client: OpenAI;

  constructor(
    private readonly config: LlmProviderConfig,
    private readonly compatibleEndpoint = false
  ) {
    if (!compatibleEndpoint && !config.apiKey) {
      throw new Error("OpenAI requires an API key");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey ?? "not-required",
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
      this.compatibleEndpoint
        ? undefined
        : {
            type: "json_schema",
            json_schema: {
              name: request.schemaName,
              strict: false,
              schema: request.jsonSchema,
            },
          }
    );
    return parseJsonResponse(text);
  }

  private async generate(
    request: LlmRequest,
    responseFormat?: OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"]
  ): Promise<string> {
    const userContent: OpenAI.Chat.Completions.ChatCompletionUserMessageParam["content"] =
      request.documents?.length
        ? [
            { type: "text", text: request.prompt },
            ...request.documents.map((document) => ({
              type: "image_url" as const,
              image_url: {
                url: `data:${document.mimeType};base64,${document.data.toString(
                  "base64"
                )}`,
              },
            })),
          ]
        : request.prompt;

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      temperature: 0.2,
      ...(this.compatibleEndpoint
        ? { max_tokens: 16_384 }
        : { max_completion_tokens: 16_384 }),
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: userContent },
      ],
      ...(responseFormat ? { response_format: responseFormat } : {}),
    });

    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("OpenAI returned no message content");
    return content;
  }
}
