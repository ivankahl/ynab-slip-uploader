import { describe, expect, test } from "bun:test";
import { LocalDocumentParser } from "./document-parser";

const image = {
  data: Buffer.from("image"),
  mimeType: "image/png",
};

const createParser = (text: string): LocalDocumentParser => {
  const parser = new LocalDocumentParser(5);
  Reflect.set(
    parser,
    "ocrServicePromise",
    Promise.resolve({
      recognize: async () => ({ text, confidence: 0.95 }),
    })
  );
  return parser;
};

describe("LocalDocumentParser", () => {
  test("returns an empty string when OCR recognizes no text", async () => {
    await expect(createParser("  \n").parse(image)).resolves.toBe("");
  });

  test("includes page metadata only for recognized text", async () => {
    await expect(createParser("  TOTAL 4.50  ").parse(image)).resolves.toBe(
      "[Page 1; OCR confidence 0.950]\nTOTAL 4.50"
    );
  });
});
