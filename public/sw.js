/* global self, clients */
// Service worker: a small script the browser keeps available in the background.
// Its job here is to show a notification when a push arrives, and to open the
// app when that notification is tapped.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// A no-op fetch handler so the browser counts this as an installable app.
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    if (event.data) data = event.data.json()
  } catch (e) {
    data = {}
  }

  const title = data.title || 'Shower Schedule'
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: data.tag || 'shower',
    renotify: true,
    data: { url: data.url || './' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || './'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, focus it.
        for (const client of windowClients) {
          if ('focus' in client) return client.focus()
        }
        // Otherwise open a new window.
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
      }),
  )
})
