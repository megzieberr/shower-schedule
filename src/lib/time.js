// Everything in this app runs on South African time (Africa/Johannesburg,
// UTC+2, no daylight saving). We never trust the device's local time zone for
// deciding what "today" is — we always ask for the SA date explicitly.

export const TZ = 'Africa/Johannesburg'
export const SLOTS = [17, 18, 19, 20, 21, 22, 23]

// Returns today's date in SA as a 'YYYY-MM-DD' string.
// 'en-CA' formatting happens to produce exactly YYYY-MM-DD.
export function saToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// Returns the current hour in SA as a number from 0 to 23.
export function saHour() {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  )
}

// Adds n calendar days to a 'YYYY-MM-DD' string and returns a new 'YYYY-MM-DD'.
// We do the maths in UTC so it never shifts a day because of a time zone.
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) + n * 86400000
  const dt = new Date(ms)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// The four days the app shows: today plus the next three.
export function visibleDates() {
  const t = saToday()
  return [0, 1, 2, 3].map((n) => addDays(t, n))
}

// "17:00" style label.
export function slotLabel(slot) {
  return `${String(slot).padStart(2, '0')}:00`
}

// "5 PM" style label (all slots are afternoon/evening).
export function slotLabel12(slot) {
  const h12 = slot > 12 ? slot - 12 : slot
  return `${h12} PM`
}

// "Today" / "Tomorrow" / "Wed" style label for the date tabs.
export function dayLabel(dateStr) {
  const today = saToday()
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, 1)) return 'Tomorrow'
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-ZA', { weekday: 'short', timeZone: 'UTC' }).format(dt)
}

// "23 Jun" style sub-label.
export function dayDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dt)
}
