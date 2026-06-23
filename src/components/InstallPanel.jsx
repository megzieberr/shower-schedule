// Plain how-to-install steps, shown on the Add-me screen and in the menu.
export default function InstallPanel({ emphasiseIos = false }) {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <section
        className={`rounded-xl border p-3 ${
          emphasiseIos ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
        }`}
      >
        <h3 className="font-semibold"> iPhone / iPad</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in the <strong>Safari</strong> browser.</li>
          <li>Tap the <strong>Share</strong> button (the square with an arrow going up).</li>
          <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Close Safari and open the app from the <strong>new icon</strong> on your home screen.</li>
          <li>Tap <strong>Allow</strong> when it asks about notifications.</li>
        </ol>
        <p className="mt-2 text-xs text-rose-600">
          On iPhone, notifications will <strong>not work at all</strong> until you add the app to
          the home screen and open it from that icon.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="font-semibold"> Android</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open this page in <strong>Chrome</strong>.</li>
          <li>
            Tap <strong>Install app</strong> if it pops up, or open the browser menu
            (three dots) and tap <strong>Add to Home screen</strong>.
          </li>
          <li>Open the app from the <strong>new icon</strong>.</li>
          <li>Tap <strong>Allow</strong> when it asks about notifications.</li>
        </ol>
      </section>
    </div>
  )
}
