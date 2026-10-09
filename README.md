# Woodhamptons Cocktail Competition

A mobile-friendly live scoring app for the Woodhamptons Cocktail Competition (Met Gala themed). Contestants
get scored on Cocktail Flavour, Costume and Presentation by everyone else competing, one contestant at a time,
with an admin controlling the pace from their phone.

## How it works

- An **admin** creates a competition by name in the Admin Panel, then shares the link.
- **Anyone with the link** types their email and taps **Log in** (no emails are sent). First time in, they
  enter their first name, surname and nickname and pick a competition from the dropdown. Only competitions
  that haven't started yet are listed. After that, typing the same email (or just reopening the site) takes
  them straight back into their game.
- Admin accounts are the emails listed in `ADMIN_EMAILS`, and they also need `ADMIN_PASSWORD` to log in, so
  nobody can get admin just by typing an admin's email. Admins join a competition through the same
  dropdown as everyone else.
- Admins can reorder the running order (up/down arrows, or **Randomize Order** for a digital "draw from a
  hat"), remove people, and reset a competition.
- Players can't leave a competition that's under way, so nobody drops out of a live round by accident.
  Admins can, via **Switch Competition** in the menu: they're taken out of the old one as if removed (off
  its running order, their scores in it deleted, and the round carries on without them).
- To clear out an old or test competition entirely, an admin uses **Delete Competition** (Admin Panel →
  Danger Zone): everyone in it goes back to the competition picker and its scores are deleted.
- Once started, each contestant gets a turn: everyone sees "*\<Name\> is up next*" while the contestant
  preps; the admin taps **Start Scoring** when ready, which opens the scoring form for everyone except that
  contestant. A checklist shows every judge with a tick once they've submitted, so the room can see who
  it's waiting on. Once every other contestant has submitted, the app automatically moves on to the next
  person.
- Everyone can close the app/phone browser at any point and reopen it later — they'll land back exactly
  where they left off, including any half-finished score (it autosaves as you tap).
- Contestants can only ever see the scores *they* gave (My Scores). Admins get a hidden **Cumulative
  Scores** page in the sidebar with the leaderboard. While a game is running it's locked: opening it plays
  a short video, then asks for `SCORES_PASSWORD` (separate from the admin password, so admins can't peek).
  Once judging is complete it opens without a password so the winner can be announced.
- Once every contestant has been judged, admins see **See Final Scores**, review the leaderboard, and tap
  **Submit Results to Everyone** — this reveals the final leaderboard on every phone and emails everyone the
  results.
- The lead admin (`LEAD_ADMIN_EMAIL`) can turn a member into a **secret observer** from the Admin Panel.
  They drop out of the running order and the judges checklist, so nobody else sees them, and their phone
  shows a live feed of every vote: who voted, the scores, comments and the running totals. Only the lead
  admin sees the Observer buttons and the list of observers. Tap **Stop** to send them back to the picker.

## Tech stack

- Node.js + Express (single process) serving both the API and the built React app
- SQLite (`better-sqlite3`) — a single file database, easy to back up
- React + Vite for the frontend
- Nodemailer via Gmail SMTP for the final results email
- Email-only login with long-lived session cookies; admins also need a shared password

## Local development

Requires Node.js 20+.

```bash
npm run install:all      # installs both server and client dependencies
cp .env.example .env     # fill in the values described below
npm run dev               # runs the API (port 3000) and Vite dev server (port 5173) together
```

Open http://localhost:5173 and log in with an email from `ADMIN_EMAILS` plus `ADMIN_PASSWORD`.

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the Node server listens on (default 3000) |
| `DB_PATH` | Where the SQLite file lives (default `./data/woodhamptons.db`) |
| `ADMIN_EMAILS` | Comma-separated list of admin emails, e.g. `ewilmoth@gmail.com,keiran@example.com` |
| `LEAD_ADMIN_EMAIL` | The one admin who can see and manage secret observers. Must also be in `ADMIN_EMAILS` |
| `ADMIN_PASSWORD` | Shared password every admin email must enter to log in. Admin login is refused if it's blank |
| `SCORES_PASSWORD` | Password to view the cumulative scores while a game is running. If blank, nobody can view them mid-game |
| `BACKUP_EMAIL` | Gets a backup email after every scored round: that round's scores and comments, plus the running totals. Leave blank to turn off |
| `GMAIL_USER` | The Gmail address the results and backup emails are sent from |
| `GMAIL_APP_PASSWORD` | A [Google App Password](https://myaccount.google.com/apppasswords) for that account (not your normal password — you'll need 2-Step Verification turned on to generate one) |

Leave `GMAIL_USER`/`GMAIL_APP_PASSWORD` blank to run in "dev mode", where the results email is printed to the
console instead of sent — handy for testing without spamming real inboxes.

## Deploying on your Windows home server

### 1. Install Node.js

Install the current LTS release from https://nodejs.org (the Windows installer). Confirm it worked by
opening PowerShell and running `node --version`.

### 2. Get the app onto the machine and build it

```powershell
git clone <your-repo-url> C:\woodhamptons
cd C:\woodhamptons
copy .env.example .env
notepad .env   # fill in ADMIN_EMAILS, ADMIN_PASSWORD, GMAIL_USER, GMAIL_APP_PASSWORD
npm run install:all
npm run build
```

`npm run build` compiles the React app into `client/dist`; the Node server serves it directly, so this is
the only build step you need. Database changes are applied automatically when the server starts.

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

Add their emails to `ADMIN_EMAILS` in `C:\woodhamptons\.env`, comma-separated, then restart the service:

```powershell
Restart-Service Woodhamptons
```

Give them `ADMIN_PASSWORD`. Removing an email from the list and restarting takes admin away straight away,
even from someone who's already logged in.

## Notes / things you can easily change later

- **Scoring weight**: the leaderboard currently ranks by the straight sum of Cocktail + Costume + Table
  Setting across every judge (`server/competitionLogic.js`, `computeLeaderboard`). Averages or different
  category weightings would be a small change there if you want it.
- **Force Advance**: the Admin Panel has a "Force Advance" button as an escape hatch, in case someone's
  phone dies mid-competition and they can never submit — it manually moves on without waiting for every
  score.
