import type {
  BinaryDocument,
  DocumentParser,
  LlmProvider,
} from "./types";
import {
  DOCUMENT_PARSER_PROMPT,
  DOCUMENT_PARSER_SYSTEM_PROMPT,
} from "./receipt-prompt";
import {
  extractPdfText,
  prepareVisualDocuments,
  renderPdfAsImages,
} from "./pdf";

export class LlmDocumentParser implements DocumentParser {
  constructor(
    private readonly provider: LlmProvider,
    private readonly maxPdfPages: number
  ) {}

  async parse(document: BinaryDocument): Promise<string> {
    const documents = await prepareVisualDocuments(document, this.maxPdfPages);
    return this.provider.generateText({
      systemPrompt: DOCUMENT_PARSER_SYSTEM_PROMPT,
      prompt: DOCUMENT_PARSER_PROMPT,
      documents,
    });
  }
}

export class LocalDocumentParser implements DocumentParser {
  private ocrServicePromise?: Promise<
    import("ppu-paddle-ocr").PaddleOcrService
  >;

  constructor(private readonly maxPdfPages: number) {}

  async parse(document: BinaryDocument): Promise<string> {
    if (document.mimeType === "application/pdf") {
      const nativeText = await extractPdfText(document, this.maxPdfPages);
      if (nativeText) return this.formatPages(nativeText, "native PDF text");

      const pages = await renderPdfAsImages(document, this.maxPdfPages);
      return this.ocrPages(pages);
    }

    return this.ocrPages([document]);
  }

  private async getOcrService() {
    this.ocrServicePromise ??= (async () => {
      const { PaddleOcrService } = await import("ppu-paddle-ocr");
      const service = new PaddleOcrService();
      await service.initialize();
      return service;
    })();
    return this.ocrServicePromise;
  }

  private async ocrPages(pages: BinaryDocument[]): Promise<string> {
    const service = await this.getOcrService();
    const output: string[] = [];

    for (const [index, page] of pages.entries()) {
      const bytes = Uint8Array.from(page.data).buffer;
      const result = await service.recognize(bytes);
      const text = result.text.trim();
      if (!text) continue;

      output.push(
        `[Page ${index + 1}; OCR confidence ${result.confidence.toFixed(3)}]\n${text}`
      );
    }

    return output.join("\n\n");
  }

  private formatPages(pages: string[], source: string): string {
    return pages
      .map((text, index) => ({ index, text: text.trim() }))
      .filter(({ text }) => text.length > 0)
      .map(({ index, text }) => `[Page ${index + 1}; ${source}]\n${text}`)
      .join("\n\n");
  }
}
