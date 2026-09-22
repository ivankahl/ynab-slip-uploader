import { describe, expect, test } from "bun:test";
import { validateReceipt } from "./shared-types";

const receipt = {
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

describe("validateReceipt", () => {
  test("accepts a valid receipt", () => {
    expect(validateReceipt(receipt, ["Groceries"])).toEqual(receipt);
  });

  test("rejects an unknown overall category", () => {
    expect(() => validateReceipt(receipt, ["Transport"])).toThrow(
      "Unknown receipt category"
    );
  });

  test("rejects an unknown line-item category", () => {
    expect(() =>
      validateReceipt(
        {
          ...receipt,
          lineItems: [{ ...receipt.lineItems[0]!, category: "Transport" }],
        },
        ["Groceries"]
      )
    ).toThrow("Unknown category for line item");
  });
});
