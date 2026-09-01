# Redot Global — Maintenance Tracker

A small internal tool for logging web maintenance work across companies, tracking
each company's remaining hours against their annual allowance, recording company
payments, and tracking personal payouts to the people doing the work.

Built as a static React app (Vite) backed entirely by [Supabase](https://supabase.com)
for auth and data storage — no custom backend server to run or deploy.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Open **SQL Editor** in the dashboard, paste in the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `companies`, `workers`, `packages`, `logs`, `payments`, and `worker_costs`
   tables, row-level-security policies that allow any signed-in user full
   access (this is an internal shared tool — everyone sees the same data),
   and a trigger that auto-creates a `workers` row for every login account
   (see "How workers work" below). The script is safe to re-run any time —
   run it again after pulling an update that changes `supabase/schema.sql`.
3. Go to **Project Settings -> API** and copy the **Project URL** and the
   **anon public** key.
4. Go to **Authentication -> Providers** and confirm **Email** is enabled.
   Under **Authentication -> Users**, click **Add user** to create a login
   for each teammate (email + password) — no seed script needed. Set their
   **name** in the "User Metadata" field as `{"name": "Their Name"}` so it
   shows up nicely instead of falling back to their email's username part.

## 2. Configure the app

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and fill in the values from step 1.3:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Install and run

```bash
npm install        # installs frontend deps too (via postinstall)
npm run dev         # starts the Vite dev server on http://localhost:5173
```

## 4. Build for production

```bash
npm run build        # outputs static files to frontend/dist
npm run preview       # optional: serve the production build locally
```

`frontend/dist` is a plain static site — deploy it to Vercel, Netlify,
Cloudflare Pages, GitHub Pages, or any static host. Set the same
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as environment variables in
your host's build settings (they're baked into the build at build time).

## How auth & data work

- Sign-in is handled entirely by Supabase Auth (email + password). There's
  no custom session/cookie logic — the Supabase client manages the session
  in the browser and refreshes tokens automatically.
- All app data (companies, logs, packages, payments, workers, worker costs)
  lives in Supabase Postgres tables and is read/written directly from the
  browser via the Supabase JS client, protected by Row Level Security.
- The maintenance report (PDF) is generated client-side with `jsPDF` — no
  server round-trip.

## Project structure

```
frontend/                  Vite + React app (the entire product)
  src/
    supabaseClient.js       Supabase client init (reads VITE_* env vars)
    auth.js                 Sign in/out, session helpers
    db.js                   CRUD helpers per table (companies, logs, ...)
    report.js                Client-side PDF report generation
    App.jsx                  Top-level shell: auth gate + tab routing
    components/               Login, Sidebar, ConfirmDialog, Icons, and one component per tab
    styles.css                Shared styles (Redot Global red/white/black theme)
supabase/schema.sql          Tables + RLS policies to run in the Supabase SQL editor
```

## How workers work

Every login account **is** a worker — there's no separate "add a worker"
step in the app. When an account signs in for the first time, a matching
row in the `workers` table is created automatically (by a database trigger,
with a client-side fallback for accounts that predate the trigger). On the
**Log Task** tab, time is always logged against whoever is currently signed
in — there's no picker, so nobody can log time as someone else. The
**People** tab shows payout totals per worker and lets you record what each
person was paid, but it no longer lets anyone create or delete worker
entries directly.

## Adding or removing teammates

Use the Supabase Dashboard: **Authentication -> Users**. Add a user (email +
password) to grant access — their worker profile is created automatically
the moment they log in. Delete a user there to revoke access; their
historical logs and payouts stay in place but become unattributed.
