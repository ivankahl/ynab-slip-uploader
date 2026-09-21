import type { BinaryDocument } from "./types";

const MAX_PDF_IMAGE_PIXELS = 16_777_216;
let pdfJsInitialization: Promise<void> | undefined;

const initializePdfJs = (): Promise<void> => {
  pdfJsInitialization ??= (async () => {
    const { definePDFJSModule } = await import("unpdf");
    await definePDFJSModule(() =>
      import("pdfjs-dist/legacy/build/pdf.mjs")
    );
  })();
  return pdfJsInitialization;
};

const toUint8Array = (buffer: Buffer): Uint8Array =>
  Uint8Array.from(buffer);

export const extractPdfText = async (
  document: BinaryDocument,
  maxPages: number
): Promise<string[] | null> => {
  await initializePdfJs();
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(toUint8Array(document.data), {
    maxImageSize: MAX_PDF_IMAGE_PIXELS,
  });

  if (pdf.numPages > maxPages) {
    throw new Error(`PDF exceeds the configured ${maxPages}-page limit`);
  }

  const result = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [result.text];
  const meaningfulCharacters = pages.join("").replace(/\s/g, "").length;
  return meaningfulCharacters >= 32 ? pages : null;
};

export const renderPdfAsImages = async (
  document: BinaryDocument,
  maxPages: number
): Promise<BinaryDocument[]> => {
  await initializePdfJs();
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const pdf = await getDocumentProxy(toUint8Array(document.data), {
    maxImageSize: MAX_PDF_IMAGE_PIXELS,
  });

  if (pdf.numPages > maxPages) {
    throw new Error(`PDF exceeds the configured ${maxPages}-page limit`);
  }

  const pages: BinaryDocument[] = [];
  for (let page = 1; page <= pdf.numPages; page++) {
    const image = await renderPageAsImage(pdf, page, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 2,
    });
    if (typeof image === "string") {
      throw new TypeError("Unexpected data URL while rendering PDF page");
    }
    pages.push({ data: Buffer.from(image), mimeType: "image/png" });
  }
  return pages;
};

export const prepareVisualDocuments = async (
  document: BinaryDocument,
  maxPdfPages: number
): Promise<BinaryDocument[]> =>
  document.mimeType === "application/pdf"
    ? renderPdfAsImages(document, maxPdfPages)
    : [document];
