// Public configuration, read from build-time environment variables.
//
// All three of these are SAFE to be public:
//   - SUPABASE_URL / SUPABASE_ANON_KEY are protected by Row Level Security
//   - VAPID_PUBLIC_KEY is designed to live in the browser
//
// NEVER put the VAPID *private* key or the service role key in here.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// True only when the two values needed to talk to Supabase are present.
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
