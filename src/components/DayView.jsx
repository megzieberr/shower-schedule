import { SLOTS, saToday, saHour } from '../lib/time.js'
import { groupBySlot, slotState } from '../lib/rules.js'
import SlotCard from './SlotCard.jsx'

export default function DayView({ date, bookings, myId, onBook, onCancel }) {
  const dayBookings = bookings.filter((b) => b.date === date)
  const bySlot = groupBySlot(dayBookings)
  const iHaveASlot = dayBookings.some((b) => b.person_id === myId)

  const today = saToday()
  const nowHour = saHour()

  return (
    <div className="grid gap-3">
      {SLOTS.map((slot) => {
        const isPast = date === today && slot < nowHour
        return (
          <SlotCard
            key={slot}
            slot={slot}
            state={slotState(slot, bySlot, myId, isPast)}
            people={bySlot[slot]}
            iHaveASlot={iHaveASlot}
            onBook={() => onBook(date, slot)}
            onCancel={() => onCancel(date)}
          />
        )
      })}
    </div>
  )
}
