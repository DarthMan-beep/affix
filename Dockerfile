# The image for the Affix web app (see docker-compose.yml). On start it applies
# pending database migrations, adds the demo data unless SEED_DEMO_DATA=false,
# then runs the self-contained server from `next build`.

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

FROM deps AS build
COPY . .
# The database client and the auth config read these when their modules load,
# which `next build` does. Nothing connects during the build; the real values
# are set at runtime in docker-compose.yml.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET="$(head -c 32 /dev/urandom | base64)" \
    BETTER_AUTH_URL=http://localhost:3000 \
    npm run build -w @affix/web
# The migration and seed scripts, bundled with their dependencies so the final
# image needs no dev tooling.
RUN BANNER="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
 && npx esbuild packages/db/src/migrate.ts --bundle --platform=node --format=esm \
      --outfile=packages/db/dist/migrate.mjs "--banner:js=$BANNER" --log-level=warning \
 && npx esbuild packages/auth/src/seed.ts --bundle --platform=node --format=esm \
      --outfile=packages/auth/dist/seed.mjs "--banner:js=$BANNER" --log-level=warning

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public apps/web/public
COPY --from=build --chown=node:node /app/packages/db/drizzle packages/db/drizzle
COPY --from=build --chown=node:node /app/packages/db/dist packages/db/dist
COPY --from=build --chown=node:node /app/packages/auth/dist packages/auth/dist
USER node
EXPOSE 3000
CMD ["sh", "-c", "node packages/db/dist/migrate.mjs && if [ \"$SEED_DEMO_DATA\" != false ]; then node packages/auth/dist/seed.mjs; fi && exec node apps/web/server.js"]
