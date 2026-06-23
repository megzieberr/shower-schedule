export default function Header({ name, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/90 px-4 py-3 backdrop-blur">
      <div>
        <h1 className="text-lg font-bold leading-tight">
          <span aria-hidden>🚿</span> Shower Schedule
        </h1>
        <p className="text-xs text-slate-500">Hi {name}</p>
      </div>
      <button
        onClick={onOpenSettings}
        aria-label="Settings"
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 active:scale-95"
      >
        ⚙️ Menu
      </button>
    </header>
  )
}
