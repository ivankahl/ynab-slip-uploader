import { describe, expect, test } from "bun:test";
import { extractPdfText, renderPdfAsImages } from "./pdf";

const createPdf = (
  text = "Corner Shop Receipt Total Amount 12.34 Thank You For Your Purchase"
): Buffer => {
  const stream = `BT /F1 18 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
};

const document = { data: createPdf(), mimeType: "application/pdf" };

describe("PDF preparation", () => {
  test("extracts embedded text", async () => {
    const pages = await extractPdfText(document, 5);
    expect(pages?.join(" ")).toContain("Corner Shop Receipt");
  });

  test("renders PDF pages as PNG images", async () => {
    const pages = await renderPdfAsImages(document, 5);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.mimeType).toBe("image/png");
    expect(pages[0]?.data.subarray(1, 4).toString()).toBe("PNG");
  });

  test("rejects sparse embedded text below the meaningful-content threshold", async () => {
    const sparseDocument = {
      data: createPdf("Page 1"),
      mimeType: "application/pdf",
    };

    await expect(extractPdfText(sparseDocument, 5)).resolves.toBeNull();
  });

  test("enforces the page limit", async () => {
    await expect(extractPdfText(document, 0)).rejects.toThrow("page limit");
  });
});
