import { prepareVisualDocuments } from "./pdf";
import {
  createReceiptJsonSchema,
  createReceiptPrompt,
  createReceiptSystemPrompt,
} from "./receipt-prompt";
import type {
  BinaryDocument,
  DocumentParser,
  LlmProvider,
} from "./types";
import { validateReceipt, type Receipt } from "../shared-types";

export class ReceiptExtractionService {
  constructor(
    private readonly provider: LlmProvider,
    private readonly documentParser: DocumentParser | undefined,
    private readonly maxPdfPages: number
  ) {}

  async parse(
    document: BinaryDocument,
    availableCategories: string[],
    existingPayees: string[] | null = null
  ): Promise<Receipt> {
    if (availableCategories.length === 0) {
      throw new Error("At least one YNAB category is required to parse a receipt");
    }

    const parsedDocument = this.documentParser
      ? await this.documentParser.parse(document)
      : undefined;
    const documents = parsedDocument
      ? undefined
      : await prepareVisualDocuments(document, this.maxPdfPages);

    const result = await this.provider.generateJson({
      schemaName: "receipt",
      jsonSchema: createReceiptJsonSchema(availableCategories),
      systemPrompt: createReceiptSystemPrompt(),
      prompt: createReceiptPrompt(
        availableCategories,
        existingPayees,
        parsedDocument
      ),
      documents,
    });

    return validateReceipt(result, availableCategories);
  }
}
