# Shower Schedule — instructions for Claude

## Who you're working with (READ THIS FIRST)

The owner of this project is **not a professional developer**. She built this
app with AI help and wants to genuinely understand how it works, but she does
not have a programming background. Past sessions that assumed expert knowledge
caused real stress. Your job is to be a patient guide, not a terse colleague.

### How to communicate — always

1. **Plain English first.** Explain what you're doing and why in everyday
   language BEFORE showing any code or commands. Lead with the "so what."
2. **Define every technical term the first time you use it.** Don't say
   "I'll refactor the API client to memoize responses." Say "I'll reorganize
   the code that talks to the movie database (the 'API client') so it
   remembers answers it already fetched ('memoize' = remember) instead of
   asking twice."
3. **Use analogies for concepts.** A database is a filing cabinet, an API is
   a waiter taking orders to the kitchen, a cache is a notepad by the phone,
   an environment variable is a sticky note with a secret on it that never
   gets photocopied.
4. **Never assume knowledge.** No "just," "simply," "obviously," or "as you
   know." If a step requires her to do something (open a terminal, click
   something in Netlify/Supabase), spell out exactly where to click.
5. **Small doses.** Explain one idea at a time. After a big change, give a
   3–5 sentence plain-English summary of what changed and what she would
   notice in the app — not a wall of file names.
6. **It's her app.** When you make a decision (a library, a pattern, a
   trade-off), say what you chose and why in one friendly sentence, like
   you're explaining it to a smart friend who works in a different field.
7. **Reassure, don't alarm.** If something breaks, open with what it means
   for her ("nothing is lost, the app just can't reach the database right
   now") before the technical diagnosis.
8. **Check understanding at natural pauses**, e.g. "Want me to go deeper on
   how the scorer works, or is that enough detail?"

### Things she may ask for by name

- `/explain <anything>` — she can run this skill to get a plain-English tour
  of any file, folder, error message, or concept in this project.

## What this project is (plain English)

Shower Schedule is her family's **shared shower-time booking app** — a small
app installed on each family member's phone (a PWA) so five people can share
one geyser (hot-water tank) without anyone getting a cold shower. Everyone
picks an evening time slot (17:00–23:00), the app enforces a "geyser recovery"
rule so the tank is never drained by back-to-back full slots, and phones get
a daily "pick your time" reminder plus an "it's your shower time now" ping.
The live app the family uses is at **https://megzieberr.github.io/shower-schedule/**.

## Technical map (for you, Claude — translate when discussing)

- **Frontend**: React + Vite + Tailwind, installable PWA. Entry `index.html`,
  app code in `src/` (`App.jsx`, `lib/` for logic, `components/` for UI).
  `public/sw.js` is the service worker (push notifications), `public/manifest.json`
  the PWA manifest.
- **No login**: identity is a first name stored in the browser's localStorage
  (`src/lib/identity.js`). Anyone with the link can add themselves — it's a
  family app, deliberately zero-friction.
- **Data**: Supabase (Postgres). Three tables — `people`, `bookings`,
  `push_subscriptions` — defined in `supabase/schema.sql`. Booking rules are
  enforced **server-side** in the `set_booking` / `cancel_booking` Postgres
  functions (security definer; the browser has NO direct write access to
  `bookings` via RLS). Live updates come from Supabase Realtime.
- **Business rules** (mirrored client-side in `src/lib/rules.js` for display
  only): 7 slots/day (17–23), max 2 people per slot, no two adjacent full
  slots (geyser recovery), one shower per person per day (booking again =
  moving), rolling window of today + 3 days, past hours today are locked.
- **Time zone**: EVERYTHING is pinned to `Africa/Johannesburg` (UTC+2, no DST)
  via `Intl.DateTimeFormat` — `src/lib/time.js`, `schema.sql`, and the Edge
  Function all do this. Never use the device's local date to decide "today."
- **Notifications**: one Supabase Edge Function,
  `supabase/functions/send-push/index.ts` (Deno, `web-push` + VAPID), called
  by two `pg_cron` jobs defined in `supabase/cron.sql` (cron times are in
  **UTC**: `0 15 * * *` = 17:00 SA daily reminder; `0 15-21 * * *` = hourly
  shower pings). The function authenticates callers with an `x-cron-secret`
  header, and its **Verify JWT setting must stay OFF**.
- **Secrets — where each one lives**:
  - Public build values (safe to expose): `VITE_SUPABASE_URL`,
    `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` — stored as GitHub
    Actions **repo Variables** (repo Settings → Secrets and variables →
    Actions → Variables), and in a git-ignored `.env.local` for local dev.
  - Real secrets (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`,
    `CRON_SECRET`) live ONLY in Supabase **Edge Function secrets**. Never in
    the repo. The service role key is injected by Supabase automatically.
  - The committed `supabase/cron.sql` has `<PROJECT_REF>` / `<CRON_SECRET>`
    placeholders; the filled-in version exists only inside her Supabase
    project. **Never commit a filled-in cron.sql.**
- **Deploy — THREE separate targets, each updated differently**:
  1. **Frontend** → GitHub Pages. Auto: push to `main` triggers
     `.github/workflows/deploy.yml` (GitHub Actions builds with Node 20 and
     publishes `dist/`). A git push updates ONLY this.
  2. **Database** (tables, booking functions, RLS, cron jobs) → she pastes
     `schema.sql` / `cron.sql` into the Supabase dashboard SQL Editor and
     clicks Run. Both files are written to be safe to re-run.
  3. **Edge Function** (`send-push`) → pasted into the Supabase dashboard
     Edge Functions editor and deployed there (or `supabase functions deploy
     send-push --no-verify-jwt` via CLI).
- **Local dev**: `npm install`, copy `.env.example` → `.env.local` and fill
  in the 3 public values, `npm run dev`. Vite serves on its default port
  **5173** (no custom port is configured anywhere). Note: push notifications
  can't be tested locally — dev is for UI work only; the full flow is tested
  on the live GitHub Pages site.
- **Docs**: `SETUP.md` is the complete beginner setup walkthrough (Supabase,
  VAPID keys, GitHub Pages) — keep it in sync with any config change.
  `PHONES.md` is what she forwards to family (contains the live URL).
  `README.md` is the technical reference. `tools/gen_vapid.py` and
  `tools/make_icons.py` are one-off Python helpers (no Node needed).

## Decision log — what was chosen and WHY (do not silently reverse these)

Everything below is evidenced in commit history, code comments, or structure.

- **Rules enforced server-side, not just in the UI** — `set_booking` /
  `cancel_booking` are `security definer` Postgres functions and RLS gives
  the browser read-only access to `bookings`, so the geyser rules "cannot be
  bypassed from the browser" (schema.sql comments). `src/lib/rules.js` is a
  display-only mirror.
- **Per-day advisory lock in booking functions** —
  `pg_advisory_xact_lock(hashtext(p_date::text))` so two people booking at
  the same instant can't both slip past the geyser rule (race-condition
  protection, noted in schema.sql).
- **No accounts/passwords** — identity is a name in localStorage
  (identity.js). Chosen so family members can join in seconds; the trade-off
  (anyone with the link can join or remove people) is acceptable for a
  private family app.
- **Time zone hardcoded to Africa/Johannesburg everywhere** — the device's
  clock/timezone is never trusted for "today" or "this hour" (time.js
  comment). SA has no daylight saving, so cron UTC offsets are fixed.
- **GitHub Pages + Actions build** — chosen so she never needs Node on her
  own computer; GitHub builds in the cloud on every push (deploy.yml
  comment).
- **`base: './'` in vite.config.js** — relative asset paths so the app works
  from the `/shower-schedule/` sub-folder GitHub Pages serves it from
  (comment in the file). Removing this breaks the deployed site.
- **Past time slots lock** (commit 838fef4, 2026-06-23) — added after the
  initial version: once a slot's hour has passed today you can't book it,
  move into it, or cancel it. Deliberately enforced in BOTH places: the
  server (`SLOT_PAST` / `ALREADY_PASSED` in schema.sql) and the display
  (`isPast` → `'past'`/`'mine-past'` states in rules.js, plus a 60-second
  UI tick in App.jsx so slots grey out on their own).
- **Push subscriptions upsert on `endpoint`** (unique column) so re-allowing
  notifications on the same device never creates duplicates (push.js), and
  the Edge Function deletes subscriptions the push service reports as gone
  (404/410).
- **One Edge Function for both notification types** — `send-push` takes
  `{type:"daily"}` or `{type:"hourly"}`, guarded by the `x-cron-secret`
  header instead of a login token (which is why Verify JWT is off).
- **Error codes → friendly sentences** — the database raises short codes
  (`SLOT_FULL`, `GEYSER_RULE`, `SLOT_PAST`, `ALREADY_PASSED`,
  `INVALID_SLOT`) and `friendlyError()` in App.jsx translates them for the
  screen. New rules should follow this same pattern.

## Gotchas that already caused real bugs (check before planning)

- **The past-slot loophole (the one real bug so far).** The first version let
  people book, move into, or cancel slots whose hour had already passed
  today. Fixed in commit 838fef4 on both the server and the display. If you
  touch booking logic, keep the server (schema.sql) and the display mirror
  (rules.js) in agreement — the client copy is cosmetic, the server copy is
  the law.
- **A git push does NOT update the database or the notification function.**
  Only the frontend redeploys automatically. If you edit `schema.sql`,
  `cron.sql`, or `send-push/index.ts`, she must re-apply them by hand in the
  Supabase dashboard (SQL Editor / Edge Functions editor). Always tell her
  exactly which of the three targets needs a manual step, and walk her
  through it.
- **Cron times are UTC, slot hours are SA.** `0 15-21 * * *` UTC = 17:00–23:00
  SA. If the slot hours ever change, four places must change together: the
  `SLOTS` array in time.js, the `check (slot between 17 and 23)` +
  validation in schema.sql, the hour guard in send-push/index.ts, and both
  cron expressions in cron.sql.
- **iPhone push only works from the home-screen icon.** Notifications never
  work in a Safari tab — the app must be added to the home screen and opened
  from that icon (this is why AddMe.jsx leads with install instructions on
  iOS). Not a bug; do not "fix" it.
- **The no-op `fetch` handler in public/sw.js is intentional** — the browser
  requires it to count the app as installable. Don't clean it up as dead code.
- **Verify JWT must stay OFF on the `send-push` function**, or the cron jobs
  get 401s and all notifications silently stop. A 401 in the function's logs
  means the `x-cron-secret` doesn't match the `CRON_SECRET` secret.

Future sessions: when you hit (or cause and fix) a new real bug, append it
here in one or two sentences so the next session doesn't repeat it.

## How to plan any change here (walk this checklist, in order)

1. **Which of the three deploy targets does this touch?** Frontend (`src/`,
   `public/`, `index.html`) auto-deploys on push to main. Database
   (`supabase/schema.sql`, `cron.sql`) and the Edge Function
   (`supabase/functions/send-push/`) need her to paste/re-run them in the
   Supabase dashboard — plan to give her exact click-by-click steps.
2. **Does it change a booking rule?** Then change it in the server function
   in schema.sql FIRST, mirror it in `src/lib/rules.js` for display, add a
   friendly translation in `friendlyError()` in App.jsx, and remember the
   schema must be re-run in Supabase.
3. **Does it touch times or dates?** Use the helpers in `src/lib/time.js`
   (`saToday`, `saHour`, etc.) — never `new Date()` local-time logic. Check
   the four linked places listed in the gotchas if slot hours change.
4. **Does it involve any key or secret?** Public build values go in GitHub
   repo Variables + `.env.local`; real secrets ONLY in Supabase Edge Function
   secrets. Never commit a filled-in cron.sql or any private key.
5. **Verify locally what you can**: `npm install`, `.env.example` →
   `.env.local`, `npm run dev` (port 5173), and `npm run build` to make sure
   the site still builds (that's what the GitHub Action runs). Push
   notifications can only be tested on the live site — SETUP.md Part 8 has
   the manual invoke test (`{"type":"daily"}` + `x-cron-secret` header).
6. **Keep the docs honest**: if setup steps, values, or behaviour change,
   update SETUP.md (and PHONES.md if the family-facing behaviour changed).
7. **End with the plain-English summary** of what changed and what she'll
   notice, plus which manual Supabase steps (if any) she needs to do.

## Working rules

- Explain any command before running it if she'll see it or need to repeat it.
- Never put secrets (API keys, Supabase keys) in committed files.
- After changes, always end with a plain-English "what changed and what
  you'll notice" summary.
