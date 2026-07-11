import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/config.js'
import { FAMILY_KEY_STORAGE } from '../lib/supabase.js'

// One-time gate: asks for the shared family code, checks it against the
// database (a correct code can read the people table; a wrong one gets an
// empty answer), then stores it on this device and reloads so the main
// client starts up sending the code with every request.
export default function FamilyGate() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')

    // Temporary client that sends the entered code, just for this check.
    const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { 'x-family-key': trimmed } },
    })
    const { data, error: err } = await probe.from('people').select('id').limit(1)

    if (!err && data && data.length > 0) {
      localStorage.setItem(FAMILY_KEY_STORAGE, trimmed)
      window.location.reload()
    } else {
      setError("That code isn't right — ask Megan for the family code.")
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">Family code</h1>
        <p className="mt-1 text-sm text-slate-500">
          This schedule is just for us. Enter the family code once and this
          device will remember it.
        </p>

        <form onSubmit={submit} className="mt-4">
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Family code"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400"
          />

          {error && (
            <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="mt-4 w-full rounded-xl bg-slate-800 px-4 py-3 text-base font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
