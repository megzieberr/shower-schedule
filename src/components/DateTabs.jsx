import { dayLabel, dayDateLabel } from '../lib/time.js'

export default function DateTabs({ dates, active, onSelect }) {
  return (
    <div className="flex gap-2">
      {dates.map((d) => {
        const selected = d === active
        return (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className={`flex-1 rounded-xl px-2 py-2 text-center transition active:scale-95 ${
              selected
                ? 'bg-sky-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="text-sm font-semibold leading-tight">{dayLabel(d)}</div>
            <div className={`text-[11px] ${selected ? 'text-sky-100' : 'text-slate-400'}`}>
              {dayDateLabel(d)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
