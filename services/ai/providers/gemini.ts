import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import type {
  LlmJsonRequest,
  LlmProvider,
  LlmProviderConfig,
  LlmRequest,
} from "../types";
import {
  DEFAULT_LLM_TEMPERATURE,
  parseJsonResponse,
} from "./helpers";

export class GeminiProvider implements LlmProvider {
  private readonly client: GoogleGenerativeAI;

  constructor(private readonly config: LlmProviderConfig) {
    if (!config.apiKey) throw new Error("Gemini requires an API key");
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  generateText(request: LlmRequest): Promise<string> {
    return this.generate(request);
  }

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    const text = await this.generate(request, {
      responseMimeType: "application/json",
      responseSchema:
        request.jsonSchema as unknown as GenerationConfig["responseSchema"],
    });
    return parseJsonResponse(text);
  }

  private async generate(
    request: LlmRequest,
    generationConfig: GenerationConfig = {}
  ): Promise<string> {
    const model = this.client.getGenerativeModel(
      {
        model: this.config.model,
        systemInstruction: request.systemPrompt,
      },
      this.config.baseUrl ? { baseUrl: this.config.baseUrl } : undefined
    );

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: request.prompt },
            ...(request.documents ?? []).map((document) => ({
              inlineData: {
                data: document.data.toString("base64"),
                mimeType: document.mimeType,
              },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: DEFAULT_LLM_TEMPERATURE,
        maxOutputTokens: 16_384,
        ...generationConfig,
      },
    });

    return result.response.text();
  }
}
