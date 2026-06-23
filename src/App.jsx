import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { isConfigured } from './lib/config.js'
import { loadPerson } from './lib/identity.js'
import { visibleDates } from './lib/time.js'
import AddMe from './components/AddMe.jsx'
import Header from './components/Header.jsx'
import DateTabs from './components/DateTabs.jsx'
import DayView from './components/DayView.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import NotConfigured from './components/NotConfigured.jsx'

function friendlyError(msg = '') {
  if (msg.includes('SLOT_FULL')) return 'That time just filled up — please pick another.'
  if (msg.includes('GEYSER_RULE'))
    return 'The geyser needs time to recover around that hour. Try a slot with a gap before or after a busy time.'
  if (msg.includes('INVALID_SLOT')) return 'That is not a valid shower time.'
  return 'Something went wrong. Please check your internet and try again.'
}

export default function App() {
  const [person, setPerson] = useState(loadPerson())
  const [dates, setDates] = useState(visibleDates())
  const [activeDate, setActiveDate] = useState(dates[0])
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Pull all bookings for the four visible days, with each person's name.
  const fetchBookings = useCallback(async () => {
    if (!supabase) return
    const ds = visibleDates()
    const { data, error: err } = await supabase
      .from('bookings')
      .select('id, person_id, date, slot, people(name)')
      .in('date', ds)
    if (!err && data) {
      setBookings(data.map((b) => ({ ...b, name: b.people?.name ?? '?' })))
    }
  }, [])

  // Initial load + live updates: whenever anyone books/moves/cancels, refetch.
  useEffect(() => {
    if (!supabase) return
    fetchBookings()
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchBookings(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchBookings])

  // When the app comes back to the foreground, recompute the visible days
  // (handles the date rolling over to a new day) and refresh.
  useEffect(() => {
    const onFocus = () => {
      const ds = visibleDates()
      setDates(ds)
      setActiveDate((cur) => (ds.includes(cur) ? cur : ds[0]))
      fetchBookings()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [fetchBookings])

  async function book(date, slot) {
    if (!person) return
    setError('')
    const { error: err } = await supabase.rpc('set_booking', {
      p_person_id: person.id,
      p_date: date,
      p_slot: slot,
    })
    if (err) setError(friendlyError(err.message))
    fetchBookings()
  }

  async function cancel(date) {
    if (!person) return
    setError('')
    const { error: err } = await supabase.rpc('cancel_booking', {
      p_person_id: person.id,
      p_date: date,
    })
    if (err) setError(friendlyError(err.message))
    fetchBookings()
  }

  if (!isConfigured) return <NotConfigured />

  if (!person) {
    return <AddMe onAdded={(p) => setPerson(p)} />
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <Header name={person.name} onOpenSettings={() => setShowSettings(true)} />

      <main className="flex-1 px-4 pb-10">
        <DateTabs dates={dates} active={activeDate} onSelect={setActiveDate} />

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4">
          <DayView
            date={activeDate}
            bookings={bookings}
            myId={person.id}
            onBook={book}
            onCancel={cancel}
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Tap any open time to book. Booking a new time moves you from your old one.
          One shower per day.
        </p>
      </main>

      {showSettings && (
        <SettingsSheet
          person={person}
          onClose={() => setShowSettings(false)}
          onSignedOut={() => {
            setPerson(null)
            setShowSettings(false)
          }}
          onChange={fetchBookings}
        />
      )}
    </div>
  )
}
