# Production deployment guide

The app is a standard Next.js Node server and a PostgreSQL database. Any host that runs Node 20.9+ with environment variables will work, including Render, Railway, Fly.io, a VPS, or Vercel paired with managed Postgres.

## 1. Database

Create a managed PostgreSQL 14+ database. Good options: Render Postgres, Neon, Supabase or Railway. Region **Singapore / Mumbai** is closest to Delhi.

- Copy its connection string into `DATABASE_URL`.
- Most managed providers require SSL, so set `DATABASE_SSL=true`.
- On serverless hosts (Vercel), use the provider's **pooled** connection string and set `DATABASE_POOL_MAX=3`.

## 2. Environment variables

Set these on the host. The full list with descriptions is in `.env.example`.

| Required | Value |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | `true` for managed Postgres |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `HASH_SECRET` | `openssl rand -hex 32` (a different value from `SESSION_SECRET`) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.in` (no trailing slash). **This is needed at build time**, so redeploy after changing it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Only for the first seed. Remove them afterwards |

The server refuses to start admin sessions in production if `SESSION_SECRET` is missing or shorter than 32 characters.

## Netlify (recommended for this project)

The repo is ready for Netlify: `netlify.toml` is included, the Next.js runtime is detected automatically, and the database is **Netlify Database** (built-in Postgres).

1. Sign in at app.netlify.com (use "Sign up with GitHub").
2. **Add new project → Import an existing project → GitHub** and choose the `myrepairunder100web` repository. Leave the build settings as detected and click **Deploy**.
3. In the project, open **Data & Storage → Database** and create the database (if Netlify hasn't already created one). Schema and starter data are applied automatically from `netlify/database/migrations/` on each production deploy.
4. **Project configuration → Environment variables**, add:
   - `SESSION_SECRET` and `HASH_SECRET`: two different random strings of 32+ characters
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters): the first time you sign in at `/admin` with exactly these, the owner account is created
   - `NEXT_PUBLIC_SITE_URL`: your Netlify address, e.g. `https://myrepairunder100.netlify.app`
5. **Deploys → Trigger deploy → Deploy site**. When it's published, open the site, then `/admin`.

Do not set `DATABASE_URL` on Netlify. When it's absent, the app uses Netlify Database automatically.

## 3. Build, migrate, seed (other hosts)

```bash
npm ci
npm run build
npm run db:migrate          # run on EVERY deploy (idempotent)
npm run db:seed             # run ONCE — inserts starter data and the first OWNER admin
npm start                   # listens on $PORT (default 3000)
```

### Render (blueprint included)

1. Push the repo to GitHub. In Render, choose **New → Blueprint** and select the repo. `render.yaml` creates the web service and a Postgres database in Singapore.
2. Fill in `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` when Render prompts for them.
3. After the first deploy, open the service's **Shell** and run `npm run db:seed` once.
4. Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment.

Migrations run automatically through `preDeployCommand`.

### Vercel

1. Import the repo. Build command: `npm run build`.
2. Add the environment variables, using a pooled connection string.
3. Run `npm run db:migrate` and `npm run db:seed` once from your machine, with `DATABASE_URL` pointing at the production database. Run `db:migrate` again on each release, for example as a GitHub Action.

### VPS (Ubuntu + Nginx + PM2)

```bash
npm ci && npm run build && npm run db:migrate
pm2 start "npm start" --name mru
```

Put Nginx in front with TLS (Let's Encrypt). Forward `X-Forwarded-For` and `X-Forwarded-Host`, because rate limiting and the CSRF check rely on them.

## 4. Domain & HTTPS

- Point your domain at the host and enable HTTPS. The app sends HSTS in production, so serve **only** over HTTPS.
- Set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy. Canonical URLs, the sitemap and structured data use this value.
- Submit `https://your-domain.in/sitemap.xml` in Google Search Console.
- Create or claim your Google Business Profile separately. The website's structured data shows only the details you enter in Settings.

## 5. After deploying — smoke test

1. Open `/`, add two services, and complete a booking with a test mobile number and an **active** pincode.
2. Open `/track` in a private window and look the booking up using its ID and mobile number.
3. Sign in at `/admin`, then confirm the booking, assign a technician and mark it completed. Refresh the customer page to see each status.
4. Change a price in the admin and check that it shows on the service page.
5. Delete the test booking's data if you want a clean slate (Postgres: `TRUNCATE bookings CASCADE;`).

## 6. Backups & operations

- Turn on the database provider's automatic daily backups and point-in-time recovery.
- Logs never contain full mobile numbers. Customer data lives only in Postgres, and only admins can see it.
- Admin users: create one account per person and use roles. Deactivate accounts when staff leave; access is revoked immediately.
- To add a schema change, edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `/drizzle`, then deploy. Migrations apply automatically.

## 7. Enabling integrations later

Add the environment variables for an integration (see the README table) and redeploy. **Admin → Settings → Integrations** shows which are configured. Notification toggles in Settings control which channels fire. Every attempt is logged per booking: sent, failed, or skipped.
