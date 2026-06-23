import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { savePerson } from '../lib/identity.js'
import { enablePush, pushSupported } from '../lib/push.js'
import { isIos, isStandalone } from '../lib/platform.js'
import InstallPanel from './InstallPanel.jsx'

export default function AddMe({ onAdded }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [showInstall, setShowInstall] = useState(false)

  // On an iPhone that has NOT been installed to the home screen, notifications
  // can never work — so we lead with the install steps there.
  const iosNeedsInstall = isIos() && !isStandalone()

  async function add() {
    const trimmed = name.trim()
    if (!trimmed) {
      setMsg('Please type your name first.')
      return
    }
    setBusy(true)
    setMsg('')

    const { data, error } = await supabase
      .from('people')
      .insert({ name: trimmed })
      .select()
      .single()

    if (error) {
      setMsg('Could not add you. Check your internet and try again.')
      setBusy(false)
      return
    }

    const person = { id: data.id, name: data.name }
    savePerson(person)

    // Ask for notification permission and register this device for push.
    if (pushSupported()) {
      const res = await enablePush(person.id)
      if (!res.ok && res.reason === 'denied') {
        setMsg('You are added! Notifications are blocked — you can turn them on later from the menu.')
      }
    }

    onAdded(person)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-10">
      <div className="text-center">
        <div className="text-5xl">🚿</div>
        <h1 className="mt-3 text-2xl font-bold">Shower Schedule</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pick your shower time so the geyser never runs cold. No password — just your name.
        </p>
      </div>

      {iosNeedsInstall && (
        <div className="mt-6">
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>iPhone:</strong> add this to your home screen first, then open it from the new
            icon — otherwise notifications will not work.
          </div>
          <div className="mt-4">
            <InstallPanel emphasiseIos />
          </div>
        </div>
      )}

      <div className="mt-8">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Your first name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="e.g. Sam"
          autoComplete="given-name"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        <button
          onClick={add}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? 'Adding…' : 'Add me'}
        </button>
        {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}
      </div>

      {!iosNeedsInstall && (
        <div className="mt-8">
          <button
            onClick={() => setShowInstall((v) => !v)}
            className="text-sm font-medium text-sky-700 underline"
          >
            {showInstall ? 'Hide install help' : 'How to install on my phone'}
          </button>
          {showInstall && (
            <div className="mt-4">
              <InstallPanel />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
