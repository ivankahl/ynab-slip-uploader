import { describe, expect, test } from "bun:test";
import { ReceiptExtractionService } from "./receipt-extractor";
import type {
  BinaryDocument,
  DocumentParser,
  LlmJsonRequest,
  LlmProvider,
  LlmRequest,
} from "./types";

const validReceipt = {
  merchant: "Corner Shop",
  transactionDate: "2026-09-21",
  memo: "Milk",
  totalAmount: 4.5,
  category: "Groceries",
  lineItems: [
    {
      productName: "Milk",
      quantity: 1,
      lineItemTotalAmount: 4.5,
      category: "Groceries",
    },
  ],
};

class FakeProvider implements LlmProvider {
  lastRequest?: LlmJsonRequest;

  generateText(_request: LlmRequest): Promise<string> {
    throw new Error("Not used by receipt extraction");
  }

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    this.lastRequest = request;
    return validReceipt;
  }
}

class FakeParser implements DocumentParser {
  lastDocument?: BinaryDocument;

  async parse(document: BinaryDocument): Promise<string> {
    this.lastDocument = document;
    return "Corner Shop\nMilk 4.50\nTOTAL 4.50";
  }
}

const image: BinaryDocument = {
  data: Buffer.from("image"),
  mimeType: "image/png",
};

describe("ReceiptExtractionService", () => {
  test("uses the extraction LLM directly when no parser is configured", async () => {
    const provider = new FakeProvider();
    const service = new ReceiptExtractionService(provider, undefined, 5);

    await service.parse(image, ["Groceries"]);

    expect(provider.lastRequest?.documents).toEqual([image]);
    expect(provider.lastRequest?.prompt).toContain("attached receipt document");
  });

  test("uses parsed text and omits images when a parser is configured", async () => {
    const provider = new FakeProvider();
    const parser = new FakeParser();
    const service = new ReceiptExtractionService(provider, parser, 5);

    await service.parse(image, ["Groceries"]);

    expect(parser.lastDocument).toEqual(image);
    expect(provider.lastRequest?.documents).toBeUndefined();
    expect(provider.lastRequest?.prompt).toContain("Corner Shop");
  });

  test("requires at least one available category", async () => {
    const service = new ReceiptExtractionService(
      new FakeProvider(),
      undefined,
      5
    );

    await expect(service.parse(image, [])).rejects.toThrow(
      "At least one YNAB category"
    );
  });
});
