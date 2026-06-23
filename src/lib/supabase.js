import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js'

// If the app has not been configured yet, we keep this null so the UI can show
// a clear "not set up" message instead of crashing.
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
