import { z } from "zod";
import {
  getProviderEnvName,
  resolveLlmProviderConfig,
} from "../services/ai/config";
import type { LlmProviderName } from "../services/ai/types";

const llmProviderSchema = z.enum([
  "gemini",
  "openai",
  "anthropic",
  "openai-compatible",
]);

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional()
);

const positiveInteger = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : defaultValue))
    .pipe(z.number().int().positive());

const envScheme = z
  .object({
    AI_PROVIDER: llmProviderSchema,

    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: optionalString,
    GEMINI_BASE_URL: optionalString,
    OPENAI_API_KEY: optionalString,
    OPENAI_MODEL: optionalString,
    OPENAI_BASE_URL: optionalString,
    ANTHROPIC_API_KEY: optionalString,
    ANTHROPIC_MODEL: optionalString,
    ANTHROPIC_BASE_URL: optionalString,
    OPENAI_COMPATIBLE_API_KEY: optionalString,
    OPENAI_COMPATIBLE_MODEL: optionalString,
    OPENAI_COMPATIBLE_BASE_URL: optionalString,

    RECEIPT_PARSER_PROVIDER: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === ""
          ? undefined
          : value,
      z.union([z.literal("local"), llmProviderSchema]).optional()
    ),
    RECEIPT_PARSER_GEMINI_API_KEY: optionalString,
    RECEIPT_PARSER_GEMINI_MODEL: optionalString,
    RECEIPT_PARSER_GEMINI_BASE_URL: optionalString,
    RECEIPT_PARSER_OPENAI_API_KEY: optionalString,
    RECEIPT_PARSER_OPENAI_MODEL: optionalString,
    RECEIPT_PARSER_OPENAI_BASE_URL: optionalString,
    RECEIPT_PARSER_ANTHROPIC_API_KEY: optionalString,
    RECEIPT_PARSER_ANTHROPIC_MODEL: optionalString,
    RECEIPT_PARSER_ANTHROPIC_BASE_URL: optionalString,
    RECEIPT_PARSER_OPENAI_COMPATIBLE_API_KEY: optionalString,
    RECEIPT_PARSER_OPENAI_COMPATIBLE_MODEL: optionalString,
    RECEIPT_PARSER_OPENAI_COMPATIBLE_BASE_URL: optionalString,
    RECEIPT_PARSER_MAX_PDF_PAGES: positiveInteger(5),

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
    APP_PORT: positiveInteger(3000),
    APP_API_KEY: z.string().nonempty(),
    APP_API_SECRET: z.string().nonempty(),
    MAX_FILE_SIZE: positiveInteger(5_242_880),
    FILE_STORAGE: z.enum(["local", "s3"]).optional(),
    DATE_SUBDIRECTORIES: z.preprocess(
      (val) => `${val}`.toLowerCase() !== "false",
      z.boolean()
    ),
    // Validate these separately when creating the storage service.
    LOCAL_DIRECTORY: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_BUCKET: optionalString,
    S3_PATH_PREFIX: optionalString,
    S3_ENDPOINT: optionalString,
  })
  .superRefine((value, context) => {
    const source = value as Record<string, unknown>;
    const validateProfile = (
      provider: LlmProviderName,
      namespace = ""
    ): void => {
      const modelName = getProviderEnvName(provider, "MODEL", namespace);
      if (!source[modelName]) {
        context.addIssue({
          code: "custom",
          path: [modelName],
          message: `${modelName} is required for the selected provider`,
        });
      }

      const apiKeyName = getProviderEnvName(provider, "API_KEY", namespace);
      if (provider !== "openai-compatible" && !source[apiKeyName]) {
        context.addIssue({
          code: "custom",
          path: [apiKeyName],
          message: `${apiKeyName} is required for the selected provider`,
        });
      }

      const baseUrlName = getProviderEnvName(provider, "BASE_URL", namespace);
      if (provider === "openai-compatible" && !source[baseUrlName]) {
        context.addIssue({
          code: "custom",
          path: [baseUrlName],
          message: `${baseUrlName} is required for the selected provider`,
        });
      }
    };

    validateProfile(value.AI_PROVIDER);

    if (
      value.RECEIPT_PARSER_PROVIDER &&
      value.RECEIPT_PARSER_PROVIDER !== "local"
    ) {
      validateProfile(value.RECEIPT_PARSER_PROVIDER, "RECEIPT_PARSER_");
    }
  });

const parsedEnv = envScheme.parse(process.env);
const receiptParserProvider = parsedEnv.RECEIPT_PARSER_PROVIDER;

const env = {
  ...parsedEnv,
  AI_CONFIG: resolveLlmProviderConfig(parsedEnv, parsedEnv.AI_PROVIDER),
  RECEIPT_PARSER_CONFIG:
    receiptParserProvider && receiptParserProvider !== "local"
      ? resolveLlmProviderConfig(
          parsedEnv,
          receiptParserProvider,
          "RECEIPT_PARSER_"
        )
      : undefined,
};

export default env;
