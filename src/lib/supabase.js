import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js'

// The shared family code. Each device enters it once (FamilyGate screen); it is
// stored locally and sent with every request as the x-family-key header, which
// the database checks (family_key_ok in supabase/migration-2-family-key.sql).
// The code itself lives only in the database and on family devices — never here.
export const FAMILY_KEY_STORAGE = 'shower_family_key'

export function getFamilyKey() {
  try {
    return localStorage.getItem(FAMILY_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function hasFamilyKey() {
  return getFamilyKey() !== ''
}

// If the app has not been configured yet, we keep this null so the UI can show
// a clear "not set up" message instead of crashing.
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
      global: hasFamilyKey()
        ? { headers: { 'x-family-key': getFamilyKey() } }
        : undefined,
    })
  : null
