// Shower Schedule — the notification sender.
//
// This one Edge Function (a small program Supabase runs on demand) handles both
// reminder jobs. The pg_cron schedules in cron.sql call it with either
//   { "type": "daily" }   -> remind people who have not booked today
//   { "type": "hourly" }  -> remind people whose shower hour is right now
//
// It runs on Deno, so libraries are imported with npm: specifiers.

import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

// --- Configuration from environment ---------------------------------------
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// Supabase. The VAPID keys and CRON_SECRET you set yourself (see SETUP.md).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:family@example.com"
const CRON_SECRET = Deno.env.get("CRON_SECRET")!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

// Today's date and current hour, in South African time.
function saNow() {
  const now = new Date()
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  )
  return { date, hour }
}

// Send one payload to everyone in personIds (across all their devices).
// Drops subscriptions the push service reports as gone (404 / 410).
async function sendTo(personIds: string[], payload: Record<string, unknown>) {
  if (personIds.length === 0) return { sent: 0, removed: 0 }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription")
    .in("person_id", personIds)

  let sent = 0
  let removed = 0
  for (const row of subs ?? []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload))
      sent++
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await admin.from("push_subscriptions").delete().eq("id", row.id)
        removed++
      }
    }
  }
  return { sent, removed }
}

Deno.serve(async (req) => {
  // Only our own cron jobs (which know the shared secret) may trigger this.
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 401 })
  }

  let body: { type?: string } = {}
  try {
    body = await req.json()
  } catch (_) {
    body = {}
  }

  const { date, hour } = saNow()

  // Daily reminder: everyone with NO booking today (who has a device).
  if (body.type === "daily") {
    const { data: people } = await admin.from("people").select("id")
    const { data: booked } = await admin.from("bookings").select("person_id").eq("date", date)
    const bookedSet = new Set((booked ?? []).map((b) => b.person_id))
    const targets = (people ?? []).map((p) => p.id).filter((id) => !bookedSet.has(id))

    const res = await sendTo(targets, {
      title: "Shower Schedule",
      body: "Pick your shower time for today.",
      url: "./",
      tag: "daily-reminder",
    })
    return Response.json({ ok: true, type: "daily", date, targets: targets.length, ...res })
  }

  // Hourly ping: people booked for the slot that equals the current SA hour.
  if (body.type === "hourly") {
    if (hour < 17 || hour > 23) {
      return Response.json({ ok: true, skipped: "outside-hours", hour })
    }
    const { data: rows } = await admin
      .from("bookings")
      .select("person_id")
      .eq("date", date)
      .eq("slot", hour)
    const targets = (rows ?? []).map((r) => r.person_id)

    const res = await sendTo(targets, {
      title: "Shower Schedule",
      body: "It's your shower time now.",
      url: "./",
      tag: "shower-now",
    })
    return Response.json({ ok: true, type: "hourly", date, hour, targets: targets.length, ...res })
  }

  return Response.json({ ok: false, error: "unknown type (use 'daily' or 'hourly')" }, { status: 400 })
})
