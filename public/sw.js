/*
 * Service Worker (PROJ-18) — ausschließlich für Erinnerungen.
 * Bewusst KEIN fetch-Handler und kein Caching: Die App soll nie veraltete
 * Fragen zeigen. Der Push-Inhalt enthält nur Titel, Kurztext und Ziel-URL
 * (keine Namen, keine Lerninhalte).
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Zeit für eine Runde'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/neutral-192.png',
    badge: data.badge || data.icon || '/icons/neutral-192.png',
    tag: 'taegliche-erinnerung', // ersetzt eine noch sichtbare ältere Meldung
    renotify: false,
    data: { url: data.url || '/quiz' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const ziel = new URL((event.notification.data && event.notification.data.url) || '/quiz', self.location.origin).href
  event.waitUntil(
    (async () => {
      const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of fenster) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) return client.navigate(ziel)
          return
        }
      }
      return self.clients.openWindow(ziel)
    })(),
  )
})
