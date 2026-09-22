FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/

WORKDIR /temp/prod
RUN bun install --frozen-lockfile --production

# The default image does not need the optional local OCR runtime. Keep these
# packages in a separate layer so release images remain lean.
FROM install AS install-without-local-ocr
RUN rm -rf \
    node_modules/onnxruntime-common \
    node_modules/onnxruntime-node \
    node_modules/ppu-ocv \
    node_modules/ppu-paddle-ocr

FROM base AS runtime
WORKDIR /usr/src/app
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun index.ts ./
COPY --chown=bun:bun services/ ./services/
COPY --chown=bun:bun utils/ ./utils/
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "start" ]

# Build with --target local-ocr only when RECEIPT_PARSER_PROVIDER=local.
FROM runtime AS local-ocr
COPY --from=install --chown=bun:bun /temp/prod/node_modules node_modules
RUN mkdir -p /home/bun/.cache/ppu-paddle-ocr && chown -R bun:bun /home/bun/.cache
USER bun
RUN bun node_modules/ppu-paddle-ocr/cli/index.js download-models

# Keep this target last so a normal docker build produces the lean image.
FROM runtime AS release
COPY --from=install-without-local-ocr --chown=bun:bun /temp/prod/node_modules node_modules
USER bun
