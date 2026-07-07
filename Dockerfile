# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build

FROM dependencies AS tooling
COPY . .
ENTRYPOINT ["sh", "scripts/migrate.sh"]

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG GIT_REVISION=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="CareGuide" \
      org.opencontainers.image.description="Production-shaped AI healthcare booking agent" \
      org.opencontainers.image.revision=$GIT_REVISION \
      org.opencontainers.image.created=$BUILD_DATE
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NODE_OPTIONS=--enable-source-maps
WORKDIR /app
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 careguide \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin careguide
COPY --from=build --chown=10001:10001 /app/.output ./.output
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
