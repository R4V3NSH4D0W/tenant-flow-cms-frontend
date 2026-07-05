# Projects CMS

Next.js admin app for a **multi-project headless CMS**. Each project owns its own pages, layouts, navigation, footer, announcements, media scope, allowed origins, and API tokens. This repo is the admin/frontend shell; the backend and Prisma live in `../cms-backend-hono`.

## Why you see “Database `cms` does not exist”

`DATABASE_URL` points at a database name (for example `…/cms`). PostgreSQL must have that database created **before** Prisma or the app can use it. This project includes `pnpm db:ensure` to create it if missing.

## First-time setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Adjust `DATABASE_URL` if your Postgres user, password, host, port, or database name differ.

3. **Postgres**

   **Option A — Docker (recommended)**  
   Starts Postgres and **creates** the `cms` database from `POSTGRES_DB`:

   ```bash
   pnpm docker:db
   ```

   **Option B — Postgres already running locally**  
   Create the database (name must match the last segment of `DATABASE_URL`):

   ```bash
   pnpm db:ensure
   ```

   Or manually: connect as a superuser and run `CREATE DATABASE cms;`, then ensure your app user can connect.

4. **Schema + seed (one command)**

   ```bash
   pnpm db:setup
   ```

   This runs: `db:ensure` (no-op if DB exists) → `db:deploy` (applies migrations) → `db:seed` (dev user + default CMS site content).

   Or step by step:

   ```bash
   pnpm db:ensure
   pnpm db:deploy
   pnpm db:seed
   ```

5. **Run the app**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The dashboard is at `/dashboard` (requires sign-in).

## Seed user and login

After `pnpm db:seed`, sign in with:

- **Email:** value of `SEED_EMAIL` in `.env`, or **`admin@example.com`** if unset  
- **Password:** value of `SEED_PASSWORD` in `.env`, or **`changeme`** if unset  

Override in `.env`:

```env
SEED_EMAIL=you@example.com
SEED_PASSWORD=your-secure-password
```

Then run `pnpm db:seed` again to upsert that user.

## Does the dashboard need Register?

**No.** The dashboard only needs **an account that exists in the database**. You can:

1. Use the **seed user** (above), or  
2. Open **`/register`** and create a new user (intended for development; add email verification before production).

So: Register is **optional** if you already seeded (or created a user another way).

## Useful commands

| Command | Purpose |
|--------|---------|
| `pnpm db:ensure` | Create the database named in `DATABASE_URL` if it does not exist |
| `pnpm db:deploy` | Apply migrations (CI/production-friendly) |
| `pnpm db:migrate` | Create/apply migrations in development |
| `pnpm db:seed` | Seed dev user + CMS site content rows |
| `pnpm db:setup` | `db:ensure` + `db:deploy` + `db:seed` |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:db` | Start Postgres via Docker Compose |

## Production

- Set `DATABASE_URL` to your managed Postgres URL (the database must exist there too).
- Run `pnpm db:deploy` during deploy.
- Do **not** rely on seed credentials; create a real admin user or use your identity provider.
# tenant-flow-cms-frontend
