FROM oven/bun AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

ENV NODE_ENV=production

USER bun
ENTRYPOINT [ "bun", "run", "index.ts" ]