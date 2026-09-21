FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/

WORKDIR /temp/prod
RUN bun install --frozen-lockfile --production

FROM base AS release
WORKDIR /usr/src/app
COPY --from=install /temp/prod/node_modules node_modules
COPY --chown=bun:bun package.json ./

ENV NODE_ENV=production

RUN mkdir -p /home/bun/.cache/ppu-paddle-ocr && chown -R bun:bun /home/bun/.cache
USER bun
RUN bun node_modules/ppu-paddle-ocr/cli/index.js download-models

COPY --chown=bun:bun index.ts ./
COPY --chown=bun:bun services/ ./services/
COPY --chown=bun:bun utils/ ./utils/
ENTRYPOINT [ "bun", "run", "start" ]