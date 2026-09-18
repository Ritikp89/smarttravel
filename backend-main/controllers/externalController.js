const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getForecast, packingHint } = require('../services/weatherService');
const { geocode, getTravelTime, mapLinks } = require('../services/mapsService');

const parseCoords = (query) => {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError(400, 'lat and lng are required');
  return { lat, lng };
};

// GET /api/external/weather?lat=&lng=&days=
const weather = asyncHandler(async (req, res) => {
  const coords = parseCoords(req.query);
  try {
    const forecast = await getForecast(coords, Number(req.query.days) || 7);
    res.json({ forecast, hint: packingHint(forecast) });
  } catch (err) {
    throw new ApiError(502, 'Weather service is not responding right now');
  }
});

// GET /api/external/geocode?q=
const geocodeSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) throw new ApiError(400, 'Type at least two characters');
  try {
    const results = await geocode(q);
    res.json({ results });
  } catch (err) {
    throw new ApiError(502, 'Geocoding service is not responding right now');
  }
});

// GET /api/external/travel-time?fromLat=&fromLng=&toLat=&toLng=&mode=
const travelTime = asyncHandler(async (req, res) => {
  const from = { lat: Number(req.query.fromLat), lng: Number(req.query.fromLng) };
  const to = { lat: Number(req.query.toLat), lng: Number(req.query.toLng) };
  if ([from.lat, from.lng, to.lat, to.lng].some(Number.isNaN)) {
    throw new ApiError(400, 'fromLat, fromLng, toLat and toLng are all required');
  }
  const result = await getTravelTime(from, to, req.query.mode || 'transit');
  res.json(result);
});

// GET /api/external/map-links?lat=&lng=&label=
const links = asyncHandler(async (req, res) => {
  const coords = parseCoords(req.query);
  res.json(mapLinks(coords, req.query.label));
});

module.exports = { weather, geocodeSearch, travelTime, links };
