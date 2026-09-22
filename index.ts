import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import env from "./utils/env-vars";
import { logger } from "hono/logger";
import {
  processAndUploadReceipt,
  ReceiptFileUploadError,
  ReceiptParseError,
  ReceiptYnabImportError,
} from "./services/receipt";

const app = new Hono();

app.use(logger());

app.post(
  "/upload",
  basicAuth({
    username: env.APP_API_KEY,
    password: env.APP_API_SECRET,
  }),
  zValidator(
    "form",
    z.object({
      account: z.string().nonempty(),
      file: z
        .instanceof(File)
        .refine(
          (f) => f.size <= env.MAX_FILE_SIZE,
          `Max file size is ${env.MAX_FILE_SIZE / 1024 / 1024}MB`
        )
        .refine((f) =>
          [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(f.type)
        ),
    })
  ),
  async (c) => {
    const { account, file } = c.req.valid("form");

    try {
      const receipt = await processAndUploadReceipt(account, file);

      return c.json(receipt, 200);
    } catch (err: unknown) {
      console.error("Error processing receipt:", err);
      const message =
        err instanceof ReceiptParseError ||
        err instanceof ReceiptYnabImportError ||
        err instanceof ReceiptFileUploadError
          ? err.message
          : "An unknown error occurred.";
      return c.json({ error: message }, 500);
    }
  }
);

app.get("/healthz", async (c) => {
  return c.text("OK", 200);
});

export default {
  port: env.APP_PORT,
  fetch: app.fetch,
};
