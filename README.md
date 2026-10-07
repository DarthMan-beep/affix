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
docker-compose.dev.yml   local Postgres 17 for development
docker-compose.yml       the whole stack as deployed on RepoRun (Postgres, migrations, web)
Dockerfile               images for that stack
stack.yml                what RepoRun exposes
.env                     single env file for every workspace (from .env.example)
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
| `viktor@affix.dev`| Affiliate with suspicious traffic (for the Fraud page) |

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

## Deploying to RepoRun

The app runs on RepoRun, the university's Docker Compose platform. RepoRun pulls the configured branch and runs `docker compose up -d --build` on `docker-compose.yml`, which starts three services:

- **db**: Postgres 17. Data lives in the `affix-pgdata` volume, which Stop never removes.
- **migrate**: applies pending migrations, adds the demo data, then exits. It runs on every start and leaves existing data alone.
- **web**: the Next.js server on port 3000. It starts once `migrate` has finished. `stack.yml` exposes it behind university login (CAS).

Set these under Environment on the stack page before the first deploy:

| Key                  | Value |
| -------------------- | ----- |
| `POSTGRES_PASSWORD`  | Letters and digits only, since it goes into the database URL. For example, `openssl rand -hex 24`. |
| `BETTER_AUTH_SECRET` | A long random string, e.g. `openssl rand -base64 32`. Changing it signs everyone out. |
| `BETTER_AUTH_URL`    | The endpoint URL shown on the stack page, e.g. `https://affix.example.edu`. Sign-in fails if this doesn't match the address in the browser. |
| `SEED_DEMO_DATA`     | Optional. `false` skips the demo accounts and sales. |

Then press Validate, then Deploy. Emails are printed to the `web` service's log, in the stack's live logs. A stack that has gone to sleep wakes on the next request, which takes a few seconds while `migrate` runs.

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

## The affiliate workspace

Everything under Promoting reads the same clicks, orders and commissions (`apps/web/src/lib/analytics.ts`):

- **Overview**: earnings today, this week and this month, daily earnings, clicks and sales for the last 7, 30 or 90 days, top links and recent activity.
- **Links**: several links per product, one per campaign (`/go/<handle>/<product>/<campaign>`), each with optional UTM tags, pause and delete, and its own clicks, sales and earnings.
- **Marketplace**: every product an affiliate may promote, filtered by category, commission type and minimum earnings per sale. A vendor can set a product to "Approved affiliates"; affiliates then apply, and the vendor decides under Selling → Applications.
- **Analytics**: any date range, with breakdowns by product, traffic source, device and country, and a weekday-by-hour click heatmap.
- **Referrals**: each affiliate has an invite link, `/join/<handle>` (`apps/web/src/app/join`). An account created through it is tied to the inviter; for 12 months the inviter earns a 5% bonus on top of each commission that account earns (`apps/web/src/lib/referrals.ts`). Affix pays the bonus out of its own fee, capped at the fee on that sale, so the vendor's and the invited affiliate's amounts don't change. A bonus follows its commission (pending, available, reversed) and is paid out with the inviter's balance. Staff set the rate and the duration under Admin → Settings.

## The vendor workspace

Everything under Selling (`apps/web/src/lib/vendor.ts`):

- **Overview**: revenue, commissions and what the vendor keeps, per day and per period, split into affiliate and direct sales, with the top affiliates and products.
- **Orders**: every sale and its split. A vendor can refund an order (simulated), which reverses the affiliate's commission unless it is already part of a payout.
- **Commissions**: per product, commissions are approved automatically after the refund window or reviewed by hand. Pending ones can be approved, rejected with a reason or put on hold, one at a time or several at once.
- **Affiliates**: who promotes what and what it brought in, and a custom commission rate for one affiliate on one product (used at checkout instead of the standard rate).
- **Creatives**: banners and ready-made text for affiliates. A banner is drawn as a PNG by `/b/<id>.png` (`apps/web/src/app/b`) from a cover image, a headline and the price; affiliates get it with an embed code that already contains their link.

## The admin workspace

For accounts with the `admin` role (`apps/web/src/lib/admin.ts`):

- **Overview**: sales on the whole platform, where the money went (vendors, affiliates, VAT, fees), the path from click to sale, and what is waiting on staff.
- **Affiliates**: search and filter every affiliate; on a profile, suspend or reinstate them, leave a staff note, hold their pending commissions, or adjust their balance with a bonus or correction.
- **Accounts**: every account, with ban and restore. A banned user is signed out everywhere and can't sign in.
- **Payouts**: mark requests as sent and completed, one at a time or several at once.
- **Fraud**: a trust score per affiliate, worked out from the last 30 days (`apps/web/src/lib/fraud.ts`): clicks from one address, bot traffic, repeat clicks, self-referrals, unusual conversion and refunds. Plus the busiest addresses and a blocklist for addresses, referring sites and email domains.
- **Settings**: the minimum payout, how often payouts are processed, which click earns a sale (last or first), what new products start with, and the referral bonus (rate and duration).

Charts are drawn by hand in SVG (`apps/web/src/components/dashboard/charts.tsx`), in the style of the landing page. Days are calendar days in the server's time zone.

## The landing page

Most of the landing page (`apps/web/src/app/page.tsx`) is illustrative marketing copy from `apps/web/src/lib/content.ts`. Two sections read the database on every visit (`getLandingLive` in `apps/web/src/lib/catalog.ts`) and are hidden if it can't be reached: the live numbers band under the hero, and the featured products, which are the best-selling published products and link to their real product pages.

## Changing the database

1. Edit the schema in `packages/db/src/schema/`.
2. `npm run db:generate` to write a migration to `packages/db/drizzle/`.
3. `npm run db:migrate` to apply it. Commit the migration with the schema change.
