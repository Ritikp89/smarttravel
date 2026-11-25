const { ApiError } = require('../middleware/errorHandler')

const isSafeHttpsUrl = (value) => {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

const sanitizeInput = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'A route object is required')
  }

  const input = {}
  for (const field of ['title', 'description', 'destination', 'sourceUrl', 'status']) {
    if (body[field] !== undefined) input[field] = body[field]
  }

  if (body.status !== undefined && !['draft', 'published'].includes(body.status)) {
    throw new ApiError(400, 'Route status must be draft or published')
  }

  if (body.stops !== undefined) {
    if (!Array.isArray(body.stops) || body.stops.length > 30) {
      throw new ApiError(400, 'A route can have up to 30 stops')
    }

    input.stops = body.stops.map((stop) => ({
      name: stop?.name,
      kind: stop?.kind,
      address: stop?.address,
      description: stop?.description,
      bookingUrl: stop?.bookingUrl,
      dayNumber: stop?.dayNumber,
      coordinates: stop?.coordinates
        ? { lat: stop.coordinates.lat, lng: stop.coordinates.lng }
        : undefined,
    }))
  }

  return input
}

module.exports = { isSafeHttpsUrl, sanitizeInput }
