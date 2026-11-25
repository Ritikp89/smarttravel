const DATABASE_NAME = 'smart-travel-offline'
const STORE_NAME = 'trip-packs'
const DATABASE_VERSION = 1
export const MAX_OFFLINE_DOCUMENT_BYTES = 25 * 1024 * 1024

const openDatabase = () => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('Offline storage is not supported in this browser.'))
    return
  }

  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE_NAME, { keyPath: 'tripId' })
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error || new Error('Could not open offline storage.'))
})

export async function getOfflinePack(tripId, accessKey) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(tripId)
    request.onsuccess = () => {
      const pack = request.result
      database.close()
      if (pack && accessKey && pack.accessKey !== accessKey) {
        reject(new Error('Offline trip pack not found on this device.'))
        return
      }
      resolve(pack || null)
    }
    request.onerror = () => {
      database.close()
      reject(request.error || new Error('Could not read the offline trip pack.'))
    }
  })
}

export async function saveOfflinePack(pack) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(pack)
    transaction.oncomplete = () => {
      database.close()
      resolve(pack)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error || new Error('Could not save the offline trip pack.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error || new Error('Offline storage ran out of space.'))
    }
  })
}

export async function cacheOfflineAppShell() {
  if (!('serviceWorker' in navigator) || !('MessageChannel' in window)) {
    throw new Error('Offline app caching is not supported in this browser.')
  }

  const registration = await navigator.serviceWorker.ready
  const worker = registration.active
  if (!worker) throw new Error('The offline app shell is not ready yet. Reload the page and try again.')

  const assets = performance.getEntriesByType('resource')
    .map((entry) => new URL(entry.name, window.location.origin))
    .filter((url) => url.origin === window.location.origin
      && !url.pathname.startsWith('/api/')
      && (/\/@vite\/client$/.test(url.pathname)
        || /\.(?:js|mjs|jsx|ts|tsx|css|svg)$/.test(url.pathname)))
    .map((url) => `${url.pathname}${url.search}`)
  const urls = [...new Set(['/', '/index.html', ...assets])]

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error('Timed out while caching the app for offline use.'))
    }, 30000)

    channel.port1.onmessage = ({ data }) => {
      window.clearTimeout(timeout)
      channel.port1.close()
      if (data?.ok) resolve()
      else reject(new Error(data?.error || 'Could not cache the app for offline use.'))
    }
    worker.postMessage({ type: 'CACHE_APP_SHELL', urls }, [channel.port2])
  })
}
