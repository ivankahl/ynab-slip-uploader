import { z } from "zod";

export const receiptLineItemSchema = z.object({
  productName: z.string().trim().min(1),
  quantity: z.number().finite().positive().optional(),
  lineItemTotalAmount: z.number().finite(),
  category: z.string().trim().min(1),
});

export const receiptSchema = z.object({
  merchant: z.string().trim().min(1),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format"),
  memo: z.string().trim(),
  totalAmount: z.number().finite(),
  category: z.string().trim().min(1),
  lineItems: z.array(receiptLineItemSchema).optional(),
});

export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptLineItem = z.infer<typeof receiptLineItemSchema>;

export const validateReceipt = (
  value: unknown,
  availableCategories: string[]
): Receipt => {
  const receipt = receiptSchema.parse(value);
  const categories = new Set(availableCategories);

  if (!categories.has(receipt.category)) {
    throw new Error(`Unknown receipt category: ${receipt.category}`);
  }

  for (const lineItem of receipt.lineItems ?? []) {
    if (!categories.has(lineItem.category)) {
      throw new Error(
        `Unknown category for line item ${lineItem.productName}: ${lineItem.category}`
      );
    }
  }

  return receipt;
};
