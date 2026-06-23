import { slotLabel, slotLabel12 } from '../lib/time.js'
import { isBookable } from '../lib/rules.js'

const CARD_STYLE = {
  open: 'bg-white border-slate-200',
  'one-left': 'bg-white border-amber-300',
  full: 'bg-slate-100 border-slate-200',
  geyser: 'bg-slate-100 border-slate-200',
  mine: 'bg-sky-50 border-sky-500 ring-2 ring-sky-200',
  past: 'bg-slate-100 border-slate-200 opacity-60',
  'mine-past': 'bg-sky-50 border-sky-200 opacity-70',
}

const STATE_LABEL = {
  open: 'Open',
  'one-left': '1 spot left',
  full: 'Full',
  geyser: 'Geyser recovering',
  mine: 'Your shower ✓',
  past: 'Passed',
  'mine-past': 'Done ✓',
}

const STATE_LABEL_STYLE = {
  open: 'text-slate-400',
  'one-left': 'text-amber-600',
  full: 'text-slate-400',
  geyser: 'text-slate-400',
  mine: 'text-sky-700',
  past: 'text-slate-400',
  'mine-past': 'text-slate-500',
}

export default function SlotCard({ slot, state, people, iHaveASlot, onBook, onCancel }) {
  const tappable = isBookable(state)
  const names = people.map((p) => p.name).join('  &  ')

  return (
    <div className={`rounded-2xl border p-4 transition ${CARD_STYLE[state]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold leading-none">{slotLabel(slot)}</div>
          <div className="mt-0.5 text-xs text-slate-400">{slotLabel12(slot)}</div>
        </div>
        <span className={`text-xs font-semibold ${STATE_LABEL_STYLE[state]}`}>
          {STATE_LABEL[state]}
        </span>
      </div>

      <div className="mt-2 min-h-[1.25rem] text-sm font-medium text-slate-700">
        {names || <span className="font-normal text-slate-400">No one yet</span>}
      </div>

      <div className="mt-3">
        {state === 'mine' ? (
          <button
            onClick={onCancel}
            className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 active:scale-95"
          >
            Cancel my shower
          </button>
        ) : tappable ? (
          <button
            onClick={onBook}
            className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white active:scale-[0.99]"
          >
            {iHaveASlot ? 'Move my shower here' : people.length ? 'Join this time' : 'Book this time'}
          </button>
        ) : (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-400"
          >
            {STATE_LABEL[state]}
          </button>
        )}
      </div>
    </div>
  )
}
