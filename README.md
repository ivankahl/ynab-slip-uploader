# YNAB Slip Uploader

A service that extracts and categorizes receipt details with a configurable LLM and automatically creates transactions in YNAB (You Need A Budget).

## Features

- Processes receipt images (JPEG, PNG, WebP) and PDFs
- Supports Gemini, OpenAI, Anthropic, and OpenAI-compatible APIs
- Optionally parses documents locally with PaddleOCR before LLM extraction
- Optionally uses a separate image-capable LLM to transcribe documents
- Automatically categorizes line items and overall transactions
- Creates split transactions in YNAB
- Basic auth protection for API endpoints

## Processing Modes

The receipt extraction LLM is selected with the required `AI_PROVIDER` value. Each provider has an independent configuration profile, so multiple providers can be configured and switching `AI_PROVIDER` is sufficient to select one. Document parsing is optional:

- Leave `RECEIPT_PARSER_PROVIDER` empty for a single-step flow. The extraction LLM receives the receipt image directly and must be image-capable.
- Set it to `local` for local PDF text extraction and PaddleOCR, followed by text-only LLM extraction and categorization.
- Set it to an LLM provider for a two-step flow: an image-capable model transcribes the receipt, then the extraction LLM processes that transcription.

PDFs sent to an LLM are rasterized into page images. The local parser first uses embedded PDF text when available and falls back to page rendering and OCR for scanned PDFs.

## Quick Start

### Prerequisites

- An API key for Gemini, OpenAI, or Anthropic, or access to an OpenAI-compatible endpoint
- A [YNAB API key](https://app.ynab.com/settings/developer)
- A [YNAB budget](https://www.ynab.com/)

### Running the Container

The following example uses Gemini in the single-step mode:

```shell
docker run \
    -e APP_API_KEY=your_api_key \
    -e APP_API_SECRET=your_api_secret \
    -e AI_PROVIDER=gemini \
    -e GEMINI_API_KEY=your_gemini_api_key \
    -e GEMINI_MODEL=gemini-2.5-flash \
    -e YNAB_API_KEY=your_ynab_api_key \
    -e YNAB_BUDGET_ID=your_ynab_budget_id \
    -p 3000:3000 \
    ivankahl/ynab-slip-uploader
```

The application uses `APP_API_KEY` as the Basic authentication username and `APP_API_SECRET` as the password. `YNAB_CATEGORY_GROUPS` can contain a comma-separated list of category groups; if empty, all categories are considered.

To use local parsing before a text-capable LLM, build the opt-in image target that includes PaddleOCR and its downloaded models. Put the remaining configuration from the example above in `.env`, then run:

```shell
docker build --target local-ocr -t ynab-slip-uploader:local-ocr .

docker run --env-file .env \
    -e RECEIPT_PARSER_PROVIDER=local \
    -p 3000:3000 \
    ynab-slip-uploader:local-ocr
```

The default `release` target excludes the local OCR runtime and models to keep the image lean. Use `local-ocr` only when `RECEIPT_PARSER_PROVIDER=local`.

To use a separate image-capable model, configure its provider and credentials:

```shell
-e RECEIPT_PARSER_PROVIDER=gemini \
-e RECEIPT_PARSER_GEMINI_API_KEY=your_parser_key \
-e RECEIPT_PARSER_GEMINI_MODEL=gemini-2.5-flash
```

Parser profiles are independent from extraction profiles, including when both stages use the same provider. This allows each stage to use different credentials, models, or endpoints.

### Check It's Running

If everything is running, you should get an `OK` response when accessing `/healthz` endpoint.

### Uploading Slip

Send the following cURL request to upload a slip:

```shell
curl -X POST 'http://localhost:3000/upload' \
  -H 'Authorization: Basic $(echo -n "YOUR_API_KEY:YOUR_API_SECRET" | base64)' \
  -F 'account=Bank Cheque Account' \
  -F 'file=@/path/to/slip.pdf' \
  --fail
```

If all goes well, you should receive a `200` response with the transaction details in a JSON object like the one below:

```json
{
  "category": "Groceries",
  "memo": "Purchased apples and mangos",
  "merchant": "Woolworths",
  "totalAmount": 86.97,
  "transactionDate": "2024-01-08",
  "lineItems": [
    {
      "category": "Groceries",
      "lineItemTotalAmount": 11.99,
      "productName": "Apples",
      "quantity": 1
    },
    {
      "category": "Groceries",
      "lineItemTotalAmount": 49.99,
      "productName": "Box of Mangos",
      "quantity": 1
    }
  ]
}
```

## Upgrading to v4

`APP_PORT` and `MAX_FILE_SIZE` now fail application startup when set to an invalid or non-positive value, such as `abc` or `0`. Remove an invalid value to use its default (`3000` and 5 MiB, respectively), or replace it with a positive integer.

## Environment Variables

The following environment variables let you configure the application:

| Environment Variable | Required | Description |
| --- | --- | --- |
| `AI_PROVIDER` | Required | Receipt extraction provider: `gemini`, `openai`, `anthropic`, or `openai-compatible`. |
| `GEMINI_API_KEY` | For Gemini | Gemini extraction API key. |
| `GEMINI_MODEL` | For Gemini | Gemini extraction model. |
| `GEMINI_BASE_URL` | Optional | Custom Gemini API base URL. |
| `OPENAI_API_KEY` | For OpenAI | OpenAI extraction API key. |
| `OPENAI_MODEL` | For OpenAI | OpenAI extraction model. |
| `OPENAI_BASE_URL` | Optional | Custom OpenAI API base URL. |
| `ANTHROPIC_API_KEY` | For Anthropic | Anthropic extraction API key. |
| `ANTHROPIC_MODEL` | For Anthropic | Anthropic extraction model. |
| `ANTHROPIC_BASE_URL` | Optional | Custom Anthropic API base URL. |
| `OPENAI_COMPATIBLE_API_KEY` | Optional | Extraction API key for an OpenAI-compatible endpoint. |
| `OPENAI_COMPATIBLE_MODEL` | For `openai-compatible` | Extraction model exposed by the compatible endpoint. |
| `OPENAI_COMPATIBLE_BASE_URL` | For `openai-compatible` | OpenAI-compatible extraction API base URL. |
| `RECEIPT_PARSER_PROVIDER` | Optional | Empty for direct extraction; otherwise `local`, `gemini`, `openai`, `anthropic`, or `openai-compatible`. |
| `RECEIPT_PARSER_GEMINI_API_KEY` | For Gemini parser | Gemini parser API key. |
| `RECEIPT_PARSER_GEMINI_MODEL` | For Gemini parser | Image-capable Gemini parser model. |
| `RECEIPT_PARSER_GEMINI_BASE_URL` | Optional | Custom Gemini parser API base URL. |
| `RECEIPT_PARSER_OPENAI_API_KEY` | For OpenAI parser | OpenAI parser API key. |
| `RECEIPT_PARSER_OPENAI_MODEL` | For OpenAI parser | Image-capable OpenAI parser model. |
| `RECEIPT_PARSER_OPENAI_BASE_URL` | Optional | Custom OpenAI parser API base URL. |
| `RECEIPT_PARSER_ANTHROPIC_API_KEY` | For Anthropic parser | Anthropic parser API key. |
| `RECEIPT_PARSER_ANTHROPIC_MODEL` | For Anthropic parser | Image-capable Anthropic parser model. |
| `RECEIPT_PARSER_ANTHROPIC_BASE_URL` | Optional | Custom Anthropic parser API base URL. |
| `RECEIPT_PARSER_OPENAI_COMPATIBLE_API_KEY` | Optional | Parser API key for an OpenAI-compatible endpoint. |
| `RECEIPT_PARSER_OPENAI_COMPATIBLE_MODEL` | For compatible parser | Image-capable model exposed by the parser endpoint. |
| `RECEIPT_PARSER_OPENAI_COMPATIBLE_BASE_URL` | For compatible parser | OpenAI-compatible parser API base URL. |
| `RECEIPT_PARSER_MAX_PDF_PAGES` | Optional | Maximum PDF pages parsed or rendered. Defaults to `5`. |
| `YNAB_API_KEY`                  | Required                         | Your YNAB Account API Key which y can generate [here](https://app.ynab.com/settings/developer).                                                                                                                                                                                                       |
| `YNAB_BUDGET_ID`                | Required                         | The ID of your YNAB budget. You'll find this in the URL when viewing your budget on YNAB.                                                                                                                                                                                                             |
| `YNAB_CATEGORY_GROUPS`          | Optional                         | A comma-separated list of category group names that should be considered when categorizing the transaction. If left blank, all categories will be used.                                                                                                                                               |
| `YNAB_INCLUDE_PAYEES_IN_PROMPT` | Optional                         | Specifies whether existing payees are sent to the extraction LLM. Can be `true` or `false`.                                                                                                                                                                                                            |
| `APP_PORT`                      | Optional                         | Port that the application should run on. Will default to `3000` if not specified.                                                                                                                                                                                                                     |
| `APP_API_KEY`                   | Required                         | The service uses Basic authentication to secure the `/upload` endpoint. This environment variable is the username.                                                                                                                                                                                    |
| `APP_API_SECRET`                | Required                         | The service uses Basic authentication to secure the `/upload` endpoint. This environment variable is the password.                                                                                                                                                                                    |
| `MAX_FILE_SIZE`                 | Optional                         | The maximum upload file size if bytes. Defaults to 5MB if not specified.                                                                                                                                                                                                                              |
| `FILE_STORAGE`                  | Optional                         | Configure where you want to save slips to: `s3` or `local`. If not specified, slips won't be saved.                                                                                                                                                                                                   |
| `DATE_SUBDIRECTORIES`            | Optional                         | Configure whether to use the transaction date to group slips in sub-directories.<br/><br/>If `false`, files will be stored in a single directory with name: `2025-01-11_merchant_12343452345.pdf`.<br/><br/>If `true`, files will be stored in subdirectories: `2025/01/11/merchant_12343452345.pdf`. |
| `LOCAL_DIRECTORY`               | Required if `FILE_STORAGE=local` | Configure where files should be stored if using local storage.                                                                                                                                                                                                                                        |
| `S3_ACCESS_KEY_ID`              | Required if `FILE_STORAGE=s3`    | Configure the access key if using S3 to store slips.                                                                                                                                                                                                                                                  |
| `S3_SECRET_ACCESS_KEY`          | Required if `FILE_STORAGE=s3`    | Configure the secret access key if using S3 to store slips.                                                                                                                                                                                                                                           |
| `S3_BUCKET`                     | Required if `FILE_STORAGE=s3`    | Configure the bucket to save slips to if using S3.                                                                                                                                                                                                                                                    |
| `S3_PATH_PREFIX`                | Optional                         | Define a path prefix to use when saving slips to S3. Will default to bucket root if none is specified.                                                                                                                                                                                                |
| `S3_ENDPOINT`                   | Required if `FILE_STORAGE=s3`    | Configure the S3 endpoint to use save slips to S3.                                                                                                                                                                                                                                                    |

Using separate parser and extraction providers sends receipt data to both services. Local parsing keeps the original document local, but its transcription is still sent to the extraction provider.

## Contributing

If you think something's missing or want to find a bug, please feel free to fork this repository and create a pull request with your changes.

### Cloning and Running the Project

If you'd like to contribute, you'll need to install the latest version of [Bun](https://bun.sh/).

Once installed, clone the repository and install the dependencies:

```shell
bun install
```

Copy the `.env.example` file and replace the placeholders with your own files.

Then, run the application using the following command:

```shell
bun run index.ts
```

Make your changes, push them and create a pull request.

## License

This repository is distributed under the [MIT License](LICENSE.md).
