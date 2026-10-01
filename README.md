# Affix

Affiliate marketing, fixed. A university project: a platform where vendors sell digital products and affiliates promote them, with instant commission payouts.

## Structure

An npm-workspaces monorepo run with [Turborepo](https://turborepo.com).

```
apps/
  web/            Next.js 16 app: landing page, sign-in/up, dashboard, product pages, checkout
packages/
  db/             Postgres schema (Drizzle ORM), client, migrations
  auth/           Better Auth config, permission rules, seed script
docker-compose.yml   local Postgres 17
.env                 single env file for every workspace (from .env.example)
```

## Getting started

Needs Node 20+, npm and Docker Desktop (running).

```bash
npm install
cp .env.example .env      # then set BETTER_AUTH_SECRET (see the comment in the file)
npm run setup             # start Postgres, apply migrations, seed demo data
npm run dev               # http://localhost:3000
```

### Demo accounts

All use the password `affix-demo-2026`.

| Email             | Access                |
| ----------------- | --------------------- |
| `admin@affix.dev` | Platform admin        |
| `jonas@affix.dev` | Vendor and affiliate  |
| `lena@affix.dev`  | Vendor                |
| `maya@affix.dev`  | Affiliate             |

Emails (verification, password reset) are printed in the terminal running `npm run dev` until an email provider is connected in `packages/auth/src/email.ts`.

## Scripts

| Command               | What it does                                           |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Start the web app                                      |
| `npm run build`       | Production build                                       |
| `npm run typecheck`   | Type-check every workspace                             |
| `npm run lint`        | Lint                                                   |
| `npm test`            | Permission rule tests                                  |
| `npm run db:up`       | Start Postgres in Docker (waits until healthy)         |
| `npm run db:down`     | Stop Postgres (data is kept in a Docker volume)        |
| `npm run db:generate` | Create a migration after changing the schema           |
| `npm run db:migrate`  | Apply pending migrations                               |
| `npm run db:seed`     | Add demo accounts, products, links and sales (safe to re-run) |
| `npm run db:studio`   | Browse the database in Drizzle Studio                  |

## Authentication and authorization

- **Authentication**: [Better Auth](https://better-auth.com) with email and password, stored in our own Postgres (`packages/auth/src/options.ts`). Sessions are database-backed cookies.
- **Roles**: one account can be a vendor, an affiliate, or both. Each capability is a profile row (`vendor`, `affiliate`); platform staff have the `admin` role.
- **Rules**: every permission is a pure function in `packages/auth/src/permissions.ts`, unit-tested in `permissions.test.ts`. Example: affiliates can't promote their own products.
- **Enforcement**: `apps/web/src/proxy.ts` only redirects visitors without a session cookie. The real checks happen on the server in `apps/web/src/lib/dal.ts` and `lib/data.ts`, which every page and Server Action goes through.

## How a sale flows

Payments and payouts are simulated: no card is charged and no money is transferred.

1. **Link**: an affiliate copies a smart link. It is shown as `affix.to/<handle>/<product>` and served locally at `/go/<handle>/<product>` (`apps/web/src/app/go`). Add `?s=instagram-bio` to tag a campaign.
2. **Click**: the link stores a `click` row (device, browser, referrer, hashed IP), sets the first-party `affix_vid` cookie and redirects to the product page `/p/<product>`.
3. **Checkout**: `/checkout/<product>` creates an `order` with the full split in cents (VAT, Affix fee, affiliate, vendor; `apps/web/src/lib/money.ts`). The sale goes to the last link that visitor clicked for that product within the product's cookie duration. Buying through your own link earns nothing.
4. **Commission**: a `commission` row is pending for the product's refund window, then approved.
5. **Payout**: once €50 is available, the affiliate requests a `payout` to a saved payout method (Promoting → Payouts). An admin marks it as sent, then completed (Admin → Payouts).

Vendors create and edit products under Selling → New product, and see every order and its split under Selling → Orders.

## Changing the database

1. Edit the schema in `packages/db/src/schema/`.
2. `npm run db:generate` to write a migration to `packages/db/drizzle/`.
3. `npm run db:migrate` to apply it. Commit the migration with the schema change.
