const CACHE_NAME = 'smart-travel-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('smart-travel-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_APP_SHELL') return

  const reply = event.ports[0]
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        const urls = (event.data.urls || []).filter((value) => {
          const url = new URL(value, self.location.origin)
          return url.origin === self.location.origin
        })
        return cache.addAll(urls)
      })
      .then(() => reply?.postMessage({ ok: true }))
      .catch(() => reply?.postMessage({ ok: false, error: 'Could not cache all app files. Stay online and try again.' }))
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)))
        }
        return response
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const saved = await cache.match(request, { ignoreSearch: true, ignoreVary: true })
        if (saved) return saved
        if (request.mode === 'navigate') {
          return await cache.match('/index.html', { ignoreVary: true })
            || await cache.match('/', { ignoreVary: true })
        }
        return Response.error()
      })
  )
})
