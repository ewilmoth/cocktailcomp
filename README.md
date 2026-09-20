# Woodhamptons Cocktail Competition

A mobile-friendly live scoring app for the Woodhamptons Cocktail Competition (Met Gala themed). Contestants
get scored on Cocktail, Costume and Table Setting by everyone else competing, one contestant at a time,
with an admin controlling the pace from their phone.

## How it works

- **Admins** (Edward, and Keiran/David once added) create contestants from the Admin Panel. Creating a
  contestant immediately emails them a magic login link — no passwords.
- Admins set the running order (drag with the up/down arrows, or tap **Randomize Order** to do a digital
  "draw from a hat").
- Once started, each contestant gets a turn: everyone sees "*\<Name\> is up next*" while the contestant
  preps; the admin taps **Start Scoring** when ready, which opens the scoring form for everyone except that
  contestant. Once every other contestant has submitted, the app automatically moves on to the next person.
- Everyone can close the app/phone browser at any point and reopen it later — they'll land back exactly
  where they left off, including any half-finished score (it autosaves as you tap).
- Contestants can only ever see the scores *they* gave (My Scores). Admins get a hidden **Cumulative
  Scores** page in the sidebar with the live leaderboard.
- Once every contestant has been judged, admins see **See Final Scores**, review the leaderboard, and tap
  **Submit Results to Everyone** — this reveals the final leaderboard on every phone and emails everyone the
  results.

## Tech stack

- Node.js + Express (single process) serving both the API and the built React app
- SQLite (`better-sqlite3`) — a single file database, easy to back up
- React + Vite for the frontend
- Nodemailer via Gmail SMTP for invite/login/results emails
- No accounts/passwords — magic link + long-lived session cookies

## Local development

Requires Node.js 20+.

```bash
npm run install:all      # installs both server and client dependencies
cp .env.example .env     # fill in the values described below
npm run seed-admin       # creates you as the first admin, using ADMIN_* vars from .env
npm run dev               # runs the API (port 3000) and Vite dev server (port 5173) together
```

Open http://localhost:5173, request a login link for your admin email, and (since `GMAIL_APP_PASSWORD` is
blank by default) the link will be printed to the server's terminal output instead of emailed — copy/paste
it into your browser to log in.

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the Node server listens on (default 3000) |
| `PUBLIC_URL` | The externally-reachable URL of the app (used to build links in emails) — e.g. `https://woodhamptons.wilmoth.cc` |
| `SESSION_SECRET` | Any long random string |
| `DB_PATH` | Where the SQLite file lives (default `./data/woodhamptons.db`) |
| `GMAIL_USER` | The Gmail address emails are sent from |
| `GMAIL_APP_PASSWORD` | A [Google App Password](https://myaccount.google.com/apppasswords) for that account (not your normal password — you'll need 2-Step Verification turned on to generate one) |
| `ADMIN_FIRST_NAME` / `ADMIN_LAST_NAME` / `ADMIN_NICKNAME` / `ADMIN_EMAIL` | Used once by `npm run seed-admin` to create the first admin account |

Leave `GMAIL_USER`/`GMAIL_APP_PASSWORD` blank to run in "dev mode", where emails are printed to the console
instead of sent — handy for testing without spamming real inboxes.

## Deploying on your Windows home server

### 1. Install Node.js

Install the current LTS release from https://nodejs.org (the Windows installer). Confirm it worked by
opening PowerShell and running `node --version`.

### 2. Get the app onto the machine and build it

```powershell
git clone <your-repo-url> C:\woodhamptons
cd C:\woodhamptons
copy .env.example .env
notepad .env   # fill in PUBLIC_URL, SESSION_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, ADMIN_*
npm run install:all
npm run build
npm run seed-admin
```

`npm run build` compiles the React app into `client/dist`; the Node server serves it directly, so this is
the only build step you need. `PUBLIC_URL` should already be set to `https://woodhamptons.wilmoth.cc` (see
step 4) before you run `seed-admin`/`build`, since it's baked into email links at send time, not build time
— so it's fine to update `.env` later too.

Test it runs: `npm start`, then visit `http://localhost:3000` from the same machine. Stop it with Ctrl+C
once you've confirmed it works — the next steps make it run permanently as a service.

### 3. Run the app as a Windows service (so it survives reboots)

The simplest option is [NSSM](https://nssm.cc/download) (Non-Sucking Service Manager):

1. Download NSSM and extract it somewhere like `C:\nssm`.
2. Open an **elevated** PowerShell (Run as Administrator) and run:
   ```powershell
   C:\nssm\win64\nssm.exe install Woodhamptons
   ```
3. In the dialog that opens:
   - **Path**: the full path to `node.exe` (find it with `(Get-Command node).Source`)
   - **Startup directory**: `C:\woodhamptons`
   - **Arguments**: `server\index.js`
4. On the "Environment" tab you can either point `NODE_ENV=production` and rely on the `.env` file (the app
   loads it automatically via `dotenv`), or paste the same variables directly here.
5. Click **Install service**, then start it:
   ```powershell
   Start-Service Woodhamptons
   ```

The service will now start automatically on boot and restart itself if the app ever crashes.

### 4. Make it reachable at `woodhamptons.wilmoth.cc` with Cloudflare Tunnel

This avoids any router/port-forwarding configuration and gives you free HTTPS.

1. Make sure `wilmoth.cc`'s DNS is managed by Cloudflare (add the domain to a free Cloudflare account if it
   isn't already, and update your domain registrar's nameservers to Cloudflare's).
2. On the Windows machine, install `cloudflared`:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
3. Authenticate and create a tunnel:
   ```powershell
   cloudflared tunnel login
   cloudflared tunnel create woodhamptons
   ```
4. Route the subdomain to the tunnel (this automatically creates the DNS record in Cloudflare):
   ```powershell
   cloudflared tunnel route dns woodhamptons woodhamptons.wilmoth.cc
   ```
5. Create `C:\Users\<you>\.cloudflared\config.yml`:
   ```yaml
   tunnel: woodhamptons
   credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json
   ingress:
     - hostname: woodhamptons.wilmoth.cc
       service: http://localhost:3000
     - service: http_status:404
   ```
6. Install it as a service too, so the tunnel survives reboots:
   ```powershell
   cloudflared service install
   ```

Give it a minute for DNS to propagate, then visit `https://woodhamptons.wilmoth.cc` from your phone.

### 5. Back up the database

Everything (users, scores, competition state) lives in one file at the path set by `DB_PATH` (default
`data/woodhamptons.db`, plus its `-wal`/`-shm` companions while the app is running). Before/after the event,
it's worth copying that file somewhere safe — e.g. a scheduled task that copies it to OneDrive/Dropbox, or
just manually copying it before and after the night.

## Adding Keiran and David as admins

Once you have their email addresses, add them the normal way: Admin Panel → Add Contestant, filling in their
details and ticking **Make this person an admin**. They'll get the same invite email and magic link as any
contestant, just with admin access once logged in.

## Notes / things you can easily change later

- **Scoring weight**: the leaderboard currently ranks by the straight sum of Cocktail + Costume + Table
  Setting across every judge (`server/competitionLogic.js`, `computeLeaderboard`). Averages or different
  category weightings would be a small change there if you want it.
- **Force Advance**: the Admin Panel has a "Force Advance" button as an escape hatch, in case someone's
  phone dies mid-competition and they can never submit — it manually moves on without waiting for every
  score.
