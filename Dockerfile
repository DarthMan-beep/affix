# Images for the Affix stack (see docker-compose.yml):
#   runner  the Next.js web app, as the self-contained server from `next build`
#   tools   applies database migrations and adds the demo data, then exits

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Every workspace's dependencies, exactly as locked.
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
RUN npm ci

# Migrations (drizzle-kit) and the seed (tsx) run straight from the package sources.
FROM deps AS tools
COPY tsconfig.base.json ./
COPY packages packages
USER node
CMD ["sh", "-c", "npm run db:migrate && if [ \"$SEED_DEMO_DATA\" != false ]; then npm run db:seed; fi"]

FROM deps AS build
COPY . .
# The database client and the auth config read these when their modules load,
# which `next build` does. Nothing connects during the build; the real values
# are set at runtime in docker-compose.yml.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET="$(head -c 32 /dev/urandom | base64)" \
    BETTER_AUTH_URL=http://localhost:3000 \
    npm run build -w @affix/web

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
