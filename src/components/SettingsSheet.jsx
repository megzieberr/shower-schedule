import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { enablePush, pushSupported } from '../lib/push.js'
import { clearPerson } from '../lib/identity.js'
import InstallPanel from './InstallPanel.jsx'

export default function SettingsSheet({ person, onClose, onSignedOut, onChange }) {
  const [people, setPeople] = useState([])
  const [notif, setNotif] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )
  const [msg, setMsg] = useState('')
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    supabase
      .from('people')
      .select('id, name, created_at')
      .order('created_at')
      .then(({ data }) => setPeople(data || []))
  }, [])

  async function turnOnNotifications() {
    setMsg('')
    const res = await enablePush(person.id)
    setNotif(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
    if (res.ok) setMsg('Notifications are on for this device. ✓')
    else if (res.reason === 'denied')
      setMsg('Notifications are blocked. Turn them back on in your phone/browser settings for this app, then tap again.')
    else if (res.reason === 'unsupported')
      setMsg('This browser cannot do notifications. On iPhone, add the app to your home screen first.')
    else setMsg('Could not turn on notifications.')
  }

  async function removePerson(id) {
    const target = people.find((p) => p.id === id)
    const isMe = id === person.id
    const ok = window.confirm(
      isMe
        ? 'Remove yourself? This deletes your bookings and signs you out on this device.'
        : `Remove ${target?.name || 'this person'}? This deletes their bookings.`,
    )
    if (!ok) return

    await supabase.from('people').delete().eq('id', id)
    setPeople((ps) => ps.filter((p) => p.id !== id))
    if (isMe) {
      clearPerson()
      onSignedOut()
    } else {
      onChange?.()
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Menu</h2>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">
            Close
          </button>
        </div>

        {/* Notifications */}
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
          <p className="mt-1 text-xs text-slate-500">
            Status on this device: <strong>{notif}</strong>
          </p>
          {pushSupported() && notif !== 'granted' && (
            <button
              onClick={turnOnNotifications}
              className="mt-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white active:scale-95"
            >
              Turn on notifications
            </button>
          )}
          {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
        </section>

        {/* Roster */}
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700">Who's in the household</h3>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {people.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm">
                  {p.name}
                  {p.id === person.id && <span className="ml-1 text-xs text-sky-600">(you)</span>}
                </span>
                <button
                  onClick={() => removePerson(p.id)}
                  className="text-xs font-medium text-rose-500"
                >
                  Remove
                </button>
              </li>
            ))}
            {people.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No one yet</li>
            )}
          </ul>
        </section>

        {/* Install help */}
        <section className="mt-6">
          <button
            onClick={() => setShowInstall((v) => !v)}
            className="text-sm font-medium text-sky-700 underline"
          >
            {showInstall ? 'Hide install help' : 'How to install on a phone'}
          </button>
          {showInstall && (
            <div className="mt-3">
              <InstallPanel />
            </div>
          )}
        </section>

        <div className="h-4" />
      </div>
    </div>
  )
}
