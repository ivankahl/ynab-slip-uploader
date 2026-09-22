import { describe, expect, test } from "bun:test";
import { parseJsonResponse } from "./helpers";

describe("parseJsonResponse", () => {
  test("parses a JSON response", () => {
    expect(parseJsonResponse('{"merchant":"Shop"}')).toEqual({
      merchant: "Shop",
    });
  });

  test("parses fenced JSON", () => {
    expect(parseJsonResponse('```json\n{"merchant":"Shop"}\n```')).toEqual({
      merchant: "Shop",
    });
  });

  test("extracts a JSON object from surrounding text", () => {
    expect(parseJsonResponse('Result: {"merchant":"Shop"} done')).toEqual({
      merchant: "Shop",
    });
  });
});
