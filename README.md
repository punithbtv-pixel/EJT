# ZYN Engineering Job Tracker (EJT)

A notification → work-order tracker for ZYN Electrical's engineering team:
departments raise **notifications** for breakdowns/maintenance, engineering
reviews and converts them into **work orders**, and technicians run the
work order lifecycle through to closure.

This is a **separate, standalone app** from the `mis` (PowerHouse MIS)
project — same stack and conventions, on purpose, so the two can be merged
into one app later without a rewrite. Nothing in `mis` is touched by this
project.

Built with **Next.js (App Router, JavaScript)**, **Prisma + PostgreSQL**,
**Tailwind CSS** and **Recharts**. Deploys to **Vercel**.

## Roles

| Role | Notifications | Work orders | Settings |
|---|---|---|---|
| **Administrator** | full | full | yes |
| **Engineering Supervisor** | review / accept / reject / convert | assign / close | no |
| **Department Supervisor** | raise (own dept) | read only | no |
| **Engineer / Technician** | — | execute own assigned work orders | no |
| **Management** | view + export CSV | view + export CSV | no (hidden) |
| **Stores** | — (no access) | — (no access) | no (hidden) — sees the Inventory menu only |

**Inventory** (store stock) is open to Administrator, Management, Stores, and
any user whose department is Electrical (whatever their role):

| | View + Export | Add / Edit / Delete a spare | Import stock |
|---|---|---|---|
| Administrator, Stores | yes | yes | yes |
| Management, Electrical department | yes | — | — |

## Inventory

**Inventory** lists the store's spares (2,990 in the ZYN store workbooks: a
*Local* list and an *Imported* list) with a search that matches every word
you type against the item name, rack/location, department and category.
Stock on hand is always `opening + received − issued`; an item is *Low* when
it is at/below its reorder level (Imported list: at or below; Local list:
strictly below — each list keeps the rule its sheet used) and *Out* at zero.

- **Import stock** reads a store workbook (the **Net stock** sheet is found
  automatically; both the "IMPORTED ITEMS" and "LOCAL ITEMS" layouts work) or
  a file exported from Inventory. It shows a preview of every change and only
  saves when you confirm. Items are matched by name; items missing from the file
  are never deleted, and a blank location/department/category never
  overwrites what is saved.
- **Export to Excel** downloads whatever is currently filtered; the same file
  can be edited and imported back.
- The real workbooks are **not committed** (`/data/*ITEMS*.xlsx` is in
  `.gitignore`). Put them in `data/` and `npm run db:seed` loads them, or use
  **Import stock** in the app. With no workbooks, UI-only mode shows a small
  sample.
- Electrical-department access is read from the login session, so users need to
  sign in again after this feature is deployed.

## Local setup

```bash
npm install

# 1. Create .env from the example and fill in DATABASE_URL + SESSION_SECRET
cp .env.example .env

# 2. Create the tables in your Postgres database
npm run db:push

# 3. Load the sample departments/users/notifications/work orders
npm run db:seed

# 4. Run
npm run dev
```

Open http://localhost:3000. Every seeded user's password is `Ejt@2026`
(e.g. username `suresh.menon`, `farid.qureshi`, `ravi.kulkarni`,
`imran.shaikh`) — change this in production by re-seeding with
`EJT_SEED_PASSWORD=your-password npm run db:seed`, or by adding real
accounts from **Settings → Users** once signed in as an Administrator.

## UI-only mock mode (no database)

Useful for a first deploy, or to demo the app before a Postgres database is
wired up.

1. Create `.env` from `.env.example`.
2. Set `UI_ONLY=true`.
3. Run `npm run dev` (or deploy — see below).

In UI-only mode: auth is auto-allowed (every visitor is signed in as an
Administrator), and API routes serve realistic in-memory sample data.
Writes (new notifications, work orders, status changes) update in-memory
state for the current server session only — nothing persists across a
restart, exactly like the sibling MIS project's own UI-only mode.

## Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the
   repo) and **Import** it in Vercel.
2. Easiest first deploy: add an environment variable **`UI_ONLY`** = `true`
   and deploy — the app works immediately with sample data, no database
   required.
3. When ready for real data: in the Vercel project, open **Storage → Create
   Database** and pick **Neon** (or any Postgres) — Vercel injects
   `DATABASE_URL` automatically. Add **`SESSION_SECRET`** (any long random
   string). Set `UI_ONLY` to `false` (or remove it) and redeploy.
4. Create the schema and load sample data against the production DB:
   ```bash
   # locally, with the production DATABASE_URL in your shell/.env
   npm run db:push
   npm run db:seed
   ```

> Any Postgres works (Neon, Supabase, Vercel Postgres) — only
> `DATABASE_URL` needs to change.

## Project layout

```
prisma/schema.prisma   User, Department, Location, JobNature, Notification, WorkOrder, InventoryItem
prisma/seed.mjs         Loads the sample data from src/lib/seedData.js
src/lib/                prisma client, roles/permissions, session, seed data, data-access layer
src/lib/store.js        Every read/write goes through here — branches between
                         Prisma (real DB) and the in-memory mock store (UI_ONLY)
src/proxy.js            Login gate + role-based page access for all routes
src/app/api/            login, logout, me, notifications, workorders, departments,
                         locations, natures, users, dashboard, inventory (+ /import)
src/app/                login, dashboard (/), notifications, workorders, inventory, settings
src/lib/inventory*.js   Stock rules, workbook parser (browser + server), data/ loader
```
