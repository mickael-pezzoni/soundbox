# syntax=docker/dockerfile:1

ARG YTDLP_VERSION=2026.08.19
ARG TARGETARCH

# The standalone yt-dlp builds bundle their own Python and CA certificates, so nothing has to be
# installed in the runtime image. One stage per architecture, since ADD cannot be made conditional.
FROM scratch AS ytdlp-amd64
ARG YTDLP_VERSION
ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux /yt-dlp

FROM scratch AS ytdlp-arm64
ARG YTDLP_VERSION
ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux_aarch64 /yt-dlp

FROM ytdlp-${TARGETARCH} AS ytdlp


FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev


FROM node:24-slim
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    BASE_URL=http://localhost:3000 \
    DB_PATH=/data/db/soundbox.db \
    UPLOADS_DIR=/data/uploads \
    YTDLP_PATH=/usr/local/bin/yt-dlp

COPY --from=ytdlp /yt-dlp /usr/local/bin/yt-dlp

# Runtime secrets/config, to provide with `docker run -e` or `--env-file` (never bake them in the image):
#   DISCORD_TOKEN          (required) bot token
#   DISCORD_CLIENT_ID      OAuth2 application id
#   DISCORD_CLIENT_SECRET  OAuth2 client secret
# BASE_URL must be the public URL of the site; "<BASE_URL>/auth/callback" must be declared in the Discord developer portal.

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public

RUN mkdir -p /data/db /data/uploads && chown -R node:node /data
VOLUME ["/data/db", "/data/uploads"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(()=>process.exit(0),()=>process.exit(1))"

CMD ["node", "dist/index.js"]
