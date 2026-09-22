import type { Receipt } from "./shared-types";
import {
  createTransaction,
  getAllEnvelopes as getAllCategories,
  getAllPayees,
} from "./budget";
import { parseReceipt } from "./receipt-extraction";
import { getStorageService } from "./storage";
import env from "../utils/env-vars";

const storageService = getStorageService();

export const processAndUploadReceipt = async (
  account: string,
  file: File
): Promise<Receipt> => {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Get the list of available YNAB categories
  const ynabCategories = await getAllCategories();

  const ynabPayees = env.YNAB_INCLUDE_PAYEES_IN_PROMPT
    ? await getAllPayees()
    : null;

  let receipt: Receipt;
  try {
    receipt = await parseReceipt(
      fileBuffer,
      file.type,
      ynabCategories,
      ynabPayees
    );
  } catch (err) {
    console.error(`Failed to parse the receipt: ${err}`);
    throw new ReceiptParseError();
  }

  try {
    await createTransaction(
      account,
      receipt.merchant,
      receipt.category,
      receipt.transactionDate,
      receipt.memo,
      receipt.totalAmount,
      receipt.lineItems?.map((li) => ({
        category: li.category,
        amount: li.lineItemTotalAmount,
      }))
    );
  } catch (err) {
    console.error(`Failed to import the receipt into YNAB: ${err}`);
    throw new ReceiptYnabImportError();
  }

  if (storageService) {
    try {
      await storageService.uploadFile(
        receipt.merchant,
        new Date(receipt.transactionDate),
        file
      );
    } catch (err) {
      console.error(`Failed to upload the receipt: ${err}`);
      throw new ReceiptFileUploadError();
    }
  }

  return receipt;
};

export class ReceiptParseError extends Error {
  constructor() {
    super("Failed to parse the receipt");
    this.name = "ReceiptParseError";
  }
}

export class ReceiptYnabImportError extends Error {
  constructor() {
    super("Failed to import the receipt into YNAB");
    this.name = "ReceiptYnabImportError";
  }
}

export class ReceiptFileUploadError extends Error {
  constructor() {
    super("Failed to upload the receipt file");
    this.name = "ReceiptFileUploadError";
  }
}
