# syntax=docker/dockerfile:1

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
    UPLOADS_DIR=/data/uploads

# Runtime secrets/config, to provide with `docker run -e` or `--env-file` (never bake them in the image):
#   DISCORD_TOKEN          (required) bot token
#   DISCORD_CLIENT_ID      OAuth2 application id
#   DISCORD_CLIENT_SECRET  OAuth2 client secret
#   DISCORD_GUILD_ID       id of the server whose members may log in
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
