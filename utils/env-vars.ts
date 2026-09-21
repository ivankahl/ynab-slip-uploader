import { z } from "zod";

const envScheme = z.object({
  GEMINI_API_KEY: z.string().nonempty(),
  GEMINI_MODEL: z.string().nonempty(),
  YNAB_API_KEY: z.string().nonempty(),
  YNAB_BUDGET_ID: z.string().nonempty(),
  YNAB_CATEGORY_GROUPS: z
    .string()
    .optional()
    .transform(
      (str) =>
        str
          ?.split(",")
          .map((categoryGroup) => categoryGroup.trim())
          .filter(Boolean) ?? []
    ),
  YNAB_INCLUDE_PAYEES_IN_PROMPT: z.preprocess(
    (val) => `${val}`.toLowerCase() !== "false",
    z.boolean()
  ),
  APP_PORT: z
    .string()
    .optional()
    .transform((str) => (str && parseInt(str)) || 3000),
  APP_API_KEY: z.string().nonempty(),
  APP_API_SECRET: z.string().nonempty(),
  MAX_FILE_SIZE: z
    .string()
    .optional()
    // Default file size is 5MB
    .transform((str) => (str && parseInt(str)) || 5242880),
  FILE_STORAGE: z.enum(["local", "s3"]).optional(),
  DATE_SUBDIRECTORIES: z.preprocess(
    (val) => `${val}`.toLowerCase() !== "false",
    z.boolean()
  ),
  // Validate all of these separately when create the storage service
  LOCAL_DIRECTORY: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PATH_PREFIX: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
});

const env = envScheme.parse(process.env);

export default env;
