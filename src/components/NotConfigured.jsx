// Shown when the app has not yet been pointed at a Supabase project.
// This only appears to whoever is setting the app up, never to the family.
export default function NotConfigured() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl">🚿</div>
      <h1 className="mt-3 text-xl font-bold">Almost there</h1>
      <p className="mt-2 text-sm text-slate-600">
        The app is not connected to its database yet. Add the three build values
        (<code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>,{' '}
        <code>VITE_VAPID_PUBLIC_KEY</code>) by following <strong>SETUP.md</strong>,
        then deploy again.
      </p>
    </div>
  )
}
