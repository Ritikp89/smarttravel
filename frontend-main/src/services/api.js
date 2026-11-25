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
  remove: (id) => api.delete(`/destinations/${id}`).then((r) => r.data),
  tags: () => api.get('/destinations/tags').then((r) => r.data.tags),
  recommended: (params) => api.get('/destinations/recommended', { params }).then((r) => r.data),
  get: (idOrSlug) => api.get(`/destinations/${idOrSlug}`).then((r) => r.data),
  activities: (idOrSlug, params) => api.get(`/destinations/${idOrSlug}/activities`, { params }).then((r) => r.data),
}

export const travelOptionApi = {
  verified: (params) => api.get('/travel-options/verified', { params }).then((r) => r.data),
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

export const groupChatApi = {
  rooms: () => api.get('/chat/rooms').then((r) => r.data.rooms),
  messages: (tripId) => api.get(`/chat/rooms/${tripId}/messages`).then((r) => r.data.messages),
  sendMessage: (tripId, content) =>
    api.post(`/chat/rooms/${tripId}/messages`, { content }).then((r) => r.data.message),
  inviteMember: (tripId, email) =>
    api.post(`/chat/rooms/${tripId}/members`, { email }).then((r) => r.data),
}

export const groupSplitApi = {
  get: (tripId) => api.get(`/trips/${tripId}/splits`).then((r) => r.data),
  create: (tripId, body) => api.post(`/trips/${tripId}/splits`, body).then((r) => r.data),
  setPaid: (tripId, expenseId, userId, paid) =>
    api.patch(`/trips/${tripId}/splits/${expenseId}/shares/${userId}`, { paid }).then((r) => r.data),
  remove: (tripId, expenseId) => api.delete(`/trips/${tripId}/splits/${expenseId}`).then((r) => r.data),
}

export const priceWatchApi = {
  list: (tripId) => api.get(`/trips/${tripId}/price-watches`).then((r) => r.data),
  create: (tripId, body) => api.post(`/trips/${tripId}/price-watches`, body).then((r) => r.data),
  check: (tripId, watchId, latestPrice) =>
    api.patch(`/trips/${tripId}/price-watches/${watchId}/check`, { latestPrice }).then((r) => r.data),
  remove: (tripId, watchId) => api.delete(`/trips/${tripId}/price-watches/${watchId}`).then((r) => r.data),
}

export const savingsPlanApi = {
  get: (tripId) => api.get(`/trips/${tripId}/savings`).then((r) => r.data),
  create: (tripId, body) => api.post(`/trips/${tripId}/savings`, body).then((r) => r.data),
  addContribution: (tripId, body) => api.post(`/trips/${tripId}/savings/contributions`, body).then((r) => r.data),
  removeContribution: (tripId, contributionId) =>
    api.delete(`/trips/${tripId}/savings/contributions/${contributionId}`).then((r) => r.data),
  remove: (tripId) => api.delete(`/trips/${tripId}/savings`).then((r) => r.data),
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

export const identityVerificationApi = {
  status: () => api.get('/identity-verification/status').then((r) => r.data),
  createSession: () => api.post('/identity-verification/session').then((r) => r.data),
}

export const soloTravelerApi = {
  trips: () => api.get('/solo-travelers/trips').then((r) => r.data.trips),
  setVisibility: (tripId, enabled) =>
    api.patch(`/solo-travelers/trips/${tripId}/visibility`, { enabled }).then((r) => r.data),
  candidates: (tripId) => api.get(`/solo-travelers/trips/${tripId}/candidates`).then((r) => r.data.candidates),
  request: (tripId, body) => api.post(`/solo-travelers/trips/${tripId}/requests`, body).then((r) => r.data),
  requests: () => api.get('/solo-travelers/requests').then((r) => r.data.matches),
  respond: (matchId, action) =>
    api.patch(`/solo-travelers/requests/${matchId}`, { action }).then((r) => r.data),
  sendMessage: (matchId, content) =>
    api.post(`/solo-travelers/requests/${matchId}/messages`, { content }).then((r) => r.data.message),
  block: (matchId) => api.post(`/solo-travelers/requests/${matchId}/block`).then((r) => r.data),
  report: (matchId, body) => api.post(`/solo-travelers/requests/${matchId}/report`, body).then((r) => r.data),
}

// ---- external ----
export const externalApi = {
  weather: (lat, lng, days = 7) => api.get('/external/weather', { params: { lat, lng, days } }).then((r) => r.data),
  mapLinks: (lat, lng, label) => api.get('/external/map-links', { params: { lat, lng, label } }).then((r) => r.data),
  geocode: (q) => api.get('/external/geocode', { params: { q } }).then((r) => r.data.results),
}

export const feedbackApi = {
  submit: (body) => api.post('/feedback', body).then((r) => r.data),
}

export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }).then((r) => r.data),
}

export const creatorItineraryApi = {
  list: () => api.get('/creator-itineraries').then((r) => r.data),
  get: (id) => api.get(`/creator-itineraries/${id}`).then((r) => r.data),
  create: (body) => api.post('/creator-itineraries', body).then((r) => r.data.itinerary),
  update: (id, body) => api.put(`/creator-itineraries/${id}`, body).then((r) => r.data.itinerary),
}

export default api
