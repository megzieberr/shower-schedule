import { VAPID_PUBLIC_KEY } from './config.js'
import { supabase } from './supabase.js'

// The service worker (a small background script the browser keeps running even
// when the app is closed) lives next to the app at <base>/sw.js.
const SW_URL = `${import.meta.env.BASE_URL}sw.js`

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_URL)
  } catch (e) {
    console.error('Service worker registration failed', e)
    return null
  }
}

// VAPID public keys are base64url text; the browser needs them as raw bytes.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Ask permission, subscribe this device to push, and store the subscription
// against the person. Returns { ok: true } or { ok: false, reason }.
export async function enablePush(personId) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-vapid' }
  if (!supabase) return { ok: false, reason: 'not-configured' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: permission } // 'denied' | 'default'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  // Upsert on endpoint so re-allowing on the same device never makes duplicates.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      person_id: personId,
      endpoint: sub.endpoint,
      subscription: sub.toJSON(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}
