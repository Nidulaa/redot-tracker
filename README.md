# Redot Global — Maintenance Tracker

A small internal tool for logging web maintenance work across companies, tracking
each company's remaining hours against their annual allowance, recording company
payments, and tracking personal payouts to the people doing the work.

## Setup

```bash
npm install
npm run seed        # create your first login (prompts for username/name/password)
npm start            # starts the server on http://localhost:3000
```

Open `http://localhost:3000` — you'll be redirected to `/login.html` if you're not
signed in. Run `npm run seed` again any time to add another teammate's login or
reset a password.

## How auth works

- Passwords are hashed with bcrypt and stored in `data/users.json` (never in plain text, never sent to the browser).
- Sessions are cookie-based (`express-session`), valid for 12 hours, `httpOnly` so JS on the page can't read the cookie.
- Every data route (`/api/storage/*`) requires a valid session — no session, no data.
- `data/users.json` and `data/store.json` are git-ignored by default so you don't accidentally commit credentials or company data. If you deploy this, keep it that way and back up `data/` separately instead.

## Project structure

```
server.js          Express app: auth routes + storage API + static serving
seed-users.js       CLI script to add/update a login
data/users.json     Hashed credentials (auto-created)
data/store.json     App data: companies, logs, payments, workers, payouts (auto-created)
public/login.html   Login screen
public/login.js     Login form logic
public/index.html   App shell
public/app.js       App logic (tabs, forms, rendering)
public/styles.css   Shared styles (Redot Global red/white/black theme)
```

## Before you put this anywhere public

- Set a real `SESSION_SECRET` environment variable (don't use the default in `server.js`).
- Serve it over HTTPS — right now cookies aren't marked `secure`, which is fine for
  `localhost` but not for a real domain. If you deploy behind HTTPS, set
  `cookie.secure = true` in `server.js` and put the app behind a reverse proxy (e.g. Nginx) or a host that terminates TLS for you.
- Consider daily backups of `data/store.json` since it's just a flat file.
