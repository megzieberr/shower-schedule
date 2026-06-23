import { SLOTS } from './time.js'

// Turn a flat list of bookings into { 17: [...], 18: [...], ... }.
export function groupBySlot(bookings) {
  const by = {}
  for (const s of SLOTS) by[s] = []
  for (const b of bookings) {
    if (by[b.slot]) by[b.slot].push(b)
  }
  return by
}

// Work out the display state of one slot, from the current person's point of view.
//
// The geyser recovery rule: a slot may only hold 2 people if neither
// neighbouring slot already holds 2. So a slot that currently has 1 person is
// "blocked" (cannot take a 2nd) when a neighbour is already full.
//
// Possible states:
//   'mine'     - I am booked in this slot
//   'full'     - 2 people already (no room)
//   'geyser'   - 1 person, but a neighbour is full so it cannot reach 2
//   'one-left' - 1 person and a 2nd is still allowed
//   'open'     - empty
export function slotState(slot, bySlot, myId) {
  const here = bySlot[slot] || []
  const count = here.length
  const mine = here.some((b) => b.person_id === myId)

  if (mine) return 'mine'
  if (count >= 2) return 'full'

  if (count === 1) {
    const before = (bySlot[slot - 1] || []).length
    const after = (bySlot[slot + 1] || []).length
    const blockedByBefore = slot > 17 && before >= 2
    const blockedByAfter = slot < 23 && after >= 2
    return blockedByBefore || blockedByAfter ? 'geyser' : 'one-left'
  }

  return 'open'
}

// Can a person tap this slot to book it? (Display only — the server checks again.)
export function isBookable(state) {
  return state === 'open' || state === 'one-left'
}
