import axios from 'axios'

export const TOKEN_KEY = 'smart-travel.token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

// Attach the JWT to every request if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalise errors so components can just read err.message, and kick the user
// out if the token has gone stale.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      (err.code === 'ECONNABORTED' ? 'That took too long - is the server running?' : null) ||
      (!err.response ? "Can't reach the server right now" : 'Something went wrong')

    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('smart-travel:logout'))
    }

    return Promise.reject(Object.assign(new Error(message), { status, details: err.response?.data?.details }))
  }
)

// ---- auth ----
export const authApi = {
  register: (body) => api.post('/auth/register', body).then((r) => r.data),
  login: (body) => api.post('/auth/login', body).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  update: (body) => api.put('/auth/me', body).then((r) => r.data.user),
  toggleSaved: (destinationId) => api.post(`/auth/saved/${destinationId}`).then((r) => r.data),
}

// ---- destinations ----
export const destinationApi = {
  list: (params) => api.get('/destinations', { params }).then((r) => r.data),
  tags: () => api.get('/destinations/tags').then((r) => r.data.tags),
  recommended: (params) => api.get('/destinations/recommended', { params }).then((r) => r.data),
  get: (idOrSlug) => api.get(`/destinations/${idOrSlug}`).then((r) => r.data),
  activities: (idOrSlug, params) => api.get(`/destinations/${idOrSlug}/activities`, { params }).then((r) => r.data),
}

// ---- trips ----
export const tripApi = {
  list: (params) => api.get('/trips', { params }).then((r) => r.data.trips),
  create: (body) => api.post('/trips', body).then((r) => r.data.trip),
  get: (id) => api.get(`/trips/${id}`).then((r) => r.data),
  update: (id, body) => api.put(`/trips/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/trips/${id}`).then((r) => r.data),
  analysis: (id) => api.get(`/trips/${id}/analysis`).then((r) => r.data.analysis),
}

export const itineraryApi = {
  generate: (tripId, body = {}) => api.post(`/trips/${tripId}/itinerary`, body).then((r) => r.data.itinerary),
  get: (tripId) => api.get(`/trips/${tripId}/itinerary`).then((r) => r.data.itinerary),
  updateDay: (tripId, dayNumber, body) =>
    api.put(`/trips/${tripId}/itinerary/days/${dayNumber}`, body).then((r) => r.data.itinerary),
  remove: (tripId) => api.delete(`/trips/${tripId}/itinerary`).then((r) => r.data),
}

export const budgetApi = {
  estimate: (tripId, body = {}) => api.post(`/trips/${tripId}/budget`, body).then((r) => r.data),
  get: (tripId) => api.get(`/trips/${tripId}/budget`).then((r) => r.data),
  update: (tripId, body) => api.put(`/trips/${tripId}/budget`, body).then((r) => r.data),
  resetLine: (tripId, category) => api.post(`/trips/${tripId}/budget/lines/${category}/reset`).then((r) => r.data),
}

// ---- external ----
export const externalApi = {
  weather: (lat, lng, days = 7) => api.get('/external/weather', { params: { lat, lng, days } }).then((r) => r.data),
  mapLinks: (lat, lng, label) => api.get('/external/map-links', { params: { lat, lng, label } }).then((r) => r.data),
}

export default api
