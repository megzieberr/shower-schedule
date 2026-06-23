# Shower Schedule 🚿

A tiny installable web app (PWA) that lets a 5-person household share one geyser
without anyone getting a cold shower. People pick a shower time for the day, and
the app enforces a "geyser recovery" rule so the tank is never drained back to
back.

- **New here / setting it up?** Follow **[SETUP.md](SETUP.md)** — it assumes zero
  prior experience.
- **Forwarding to family?** Send them **[PHONES.md](PHONES.md)**.

This README is the technical reference.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + Vite + Tailwind, built as an installable PWA |
| Hosting | GitHub Pages (static build, deployed by GitHub Actions) |
| Data / realtime / auth-less identity | Supabase (Postgres + Realtime) |
| Scheduling | Supabase `pg_cron` + `pg_net` |
| Push sending | Supabase Edge Function (Deno) using `web-push` + VAPID |

All times are **South African time** (`Africa/Johannesburg`, UTC+2, no DST),
pinned everywhere via `Intl.DateTimeFormat({ timeZone: 'Africa/Johannesburg' })`.

## The rules

Seven slots a day: **17:00–23:00**.

1. Each slot holds a maximum of **2 people**.
2. **Geyser recovery:** no two back-to-back slots may both have 2 people. When a
   slot reaches 2, the slot before and the slot after can each hold only 1. A
   slot with just 1 person "resets" the chain.
3. **One shower per person per day.** Booking a new slot moves you off your old one.
4. **Rolling window:** today + the next 3 days are visible; past days disappear.
5. A person can book or change any time during a visible day — **but once a
   slot's hour has passed today, it locks** (you can't book it, move into it, or
   cancel it). Enforced server-side too.

These rules are enforced **server-side** in the `set_booking` Postgres function,
so they cannot be bypassed from the browser.

## Project layout

```
shower-schedule/
├─ index.html, vite.config.js, tailwind.config.js, postcss.config.js
├─ .env.example                 # the 3 public build values
├─ .github/workflows/deploy.yml # builds + deploys to GitHub Pages
├─ public/
│  ├─ manifest.json             # PWA manifest
│  ├─ sw.js                     # service worker (push + notificationclick)
│  └─ icon-*.png                # app icons
├─ src/
│  ├─ main.jsx, App.jsx, index.css
│  ├─ lib/   (config, supabase, time, rules, identity, platform, push)
│  └─ components/ (AddMe, Header, DateTabs, DayView, SlotCard, SettingsSheet, InstallPanel, NotConfigured)
├─ supabase/
│  ├─ schema.sql                # tables, RLS, set_booking/cancel_booking, realtime
│  ├─ cron.sql                  # the two pg_cron schedules
│  └─ functions/send-push/index.ts  # the notification sender (Deno)
└─ tools/
   ├─ make_icons.py             # regenerate the PNG icons
   └─ gen_vapid.py              # generate a VAPID key pair (no Node needed)
```

## Data model

- `people` — `id`, `name`, `created_at`
- `push_subscriptions` — `id`, `person_id`, `endpoint` (unique), `subscription` (jsonb), `created_at`
- `bookings` — `id`, `person_id`, `date`, `slot` (17–23), `created_at`, **unique(person_id, date)**

## Server API (Supabase RPC)

- `set_booking(p_person_id uuid, p_date date, p_slot int)` — books/moves with an
  advisory lock per day; raises `SLOT_FULL`, `GEYSER_RULE`, or `INVALID_SLOT`.
- `cancel_booking(p_person_id uuid, p_date date)` — removes that day's booking.

## Notifications

One Edge Function, `send-push`, called by two cron jobs (times in UTC):

- `0 15 * * *` → `{type:"daily"}` → "Pick your shower time for today" to everyone
  with no booking today.
- `0 15-21 * * *` → `{type:"hourly"}` → "It's your shower time now" to whoever is
  booked for the current SA hour.

The function authenticates the caller with a shared `x-cron-secret` header.

## Local development (optional, needs Node)

```bash
npm install
cp .env.example .env.local   # fill in your 3 values
npm run dev
```

> Note: push notifications only work over HTTPS on a real installed app, so the
> dev server is mainly for working on the UI. The full flow is tested on the
> deployed GitHub Pages site.

## Configuration

Three **public** build values (safe to expose; protected by RLS / meant for the
browser): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.

Two **secret** values that live **only** in Supabase Edge Function secrets and
never in the repo: `VAPID_PRIVATE_KEY`, plus the `CRON_SECRET`. The service role
key is provided to the function automatically by Supabase.
