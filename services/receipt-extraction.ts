import env from "../utils/env-vars";
import { createLlmProvider } from "./ai/factory";
import {
  LocalDocumentParser,
  LlmDocumentParser,
} from "./ai/document-parser";
import { ReceiptExtractionService } from "./ai/receipt-extractor";
import type { DocumentParser } from "./ai/types";
import type { Receipt } from "./shared-types";

const receiptProvider = createLlmProvider(env.AI_CONFIG);

const createConfiguredDocumentParser = (): DocumentParser | undefined => {
  const parserProvider = env.RECEIPT_PARSER_PROVIDER;
  if (!parserProvider) return undefined;

  if (parserProvider === "local") {
    return new LocalDocumentParser(env.RECEIPT_PARSER_MAX_PDF_PAGES);
  }

  if (!env.RECEIPT_PARSER_CONFIG) {
    throw new Error("Missing receipt parser provider configuration");
  }

  return new LlmDocumentParser(
    createLlmProvider(env.RECEIPT_PARSER_CONFIG),
    env.RECEIPT_PARSER_MAX_PDF_PAGES
  );
};

const documentParser = createConfiguredDocumentParser();

const receiptExtractor = new ReceiptExtractionService(
  receiptProvider,
  documentParser,
  env.RECEIPT_PARSER_MAX_PDF_PAGES
);

export const parseReceipt = async (
  image: Buffer,
  mimeType: string,
  availableCategories: string[],
  existingPayees: string[] | null = null
): Promise<Receipt> =>
  receiptExtractor.parse(
    { data: image, mimeType },
    availableCategories,
    existingPayees
  );
