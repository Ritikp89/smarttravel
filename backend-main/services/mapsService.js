const axios = require('axios');
const destinationCatalog = require('../seed/data/destinations');

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OPEN_METEO_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search';
const GOOGLE_DIRECTIONS = 'https://maps.googleapis.com/maps/api/directions/json';

// Cache geocode lookups - Nominatim asks for max 1 req/sec and these rarely change.
const geocodeCache = new Map();

const normalizeSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const searchDestinationCatalog = (query) => {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  return destinationCatalog
    .map((destination) => {
      const name = normalizeSearchText(destination.name);
      const country = normalizeSearchText(destination.country);
      const searchableText = normalizeSearchText([
        destination.name,
        destination.country,
        destination.region,
        destination.slug,
        destination.tagline,
        destination.description,
        ...(destination.tags || []),
        ...(destination.knownFor || []),
      ].join(' '));

      if (!terms.every((term) => searchableText.includes(term))) return null;

      const score = name === normalizedQuery
        ? 100
        : name.startsWith(normalizedQuery)
          ? 85
          : name.includes(normalizedQuery)
            ? 75
            : country === normalizedQuery
              ? 65
              : country.includes(normalizedQuery)
                ? 55
                : 35;

      return {
        score,
        popularity: destination.popularity || 0,
        place: {
          label: `${destination.name}, ${destination.country}`,
          lat: destination.coordinates?.lat,
          lng: destination.coordinates?.lng,
          type: 'city',
          country: destination.country,
          city: destination.name,
          source: 'catalog',
        },
      };
    })
    .filter((match) => match && Number.isFinite(match.place.lat) && Number.isFinite(match.place.lng))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .map((match) => match.place);
};

const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in km. Good enough for "how far apart are these two museums".
const haversineKm = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Effective in-city speeds (km/h) - deliberately pessimistic, they include waiting/finding the place.
const SPEEDS = { walking: 4.5, transit: 15, driving: 22 };

const pickMode = (km) => {
  if (km <= 1.6) return 'walking';
  if (km <= 12) return 'transit';
  return 'driving';
};

/**
 * Estimate travel time between two points without hitting any external API.
 * Returns { minutes, km, mode }.
 */
const estimateTravel = (from, to) => {
  const km = haversineKm(from, to);
  if (km == null) return { minutes: 15, km: null, mode: 'unknown' };
  // straight-line -> street distance fudge factor
  const streetKm = km * 1.3;
  const mode = pickMode(streetKm);
  const minutes = Math.round((streetKm / SPEEDS[mode]) * 60) + (mode === 'walking' ? 0 : 6);
  return { minutes: Math.max(5, minutes), km: Number(streetKm.toFixed(1)), mode };
};

/**
 * Real travel time via Google Directions when a key is configured, otherwise the estimate above.
 */
const getTravelTime = async (from, to, mode = 'transit') => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ...estimateTravel(from, to), provider: 'estimate' };

  try {
    const { data } = await axios.get(GOOGLE_DIRECTIONS, {
      params: {
        origin: `${from.lat},${from.lng}`,
        destination: `${to.lat},${to.lng}`,
        mode,
        key,
      },
      timeout: 6000,
    });
    const leg = data.routes?.[0]?.legs?.[0];
    if (!leg) throw new Error('No route returned');
    return {
      minutes: Math.round(leg.duration.value / 60),
      km: Number((leg.distance.value / 1000).toFixed(1)),
      mode,
      provider: 'google',
    };
  } catch (err) {
    console.warn('Directions API failed, falling back to estimate:', err.message);
    return { ...estimateTravel(from, to), provider: 'estimate' };
  }
};

const geocode = async (query) => {
  const q = query.trim().toLowerCase();
  if (geocodeCache.has(q)) return geocodeCache.get(q);

  const catalogResults = searchDestinationCatalog(query);
  let providerResults = [];
  let providerError = null;
  try {
    const { data } = await axios.get(`${NOMINATIM}/search`, {
      params: { q: query, format: 'json', limit: 15, addressdetails: 1 },
      headers: { 'User-Agent': 'smart-travel-app/1.0 (dev)' },
      timeout: 8000,
    });

    providerResults = data.map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      type: r.type,
      country: r.address?.country,
      city: r.address?.city || r.address?.town || r.address?.village,
      source: 'openstreetmap',
    }));
  } catch (err) {
    providerError = err;
  }

  // GeoNames fills in cities and towns if the map geocoder is unavailable or has no match.
  if (!providerResults.length) {
    try {
      const { data } = await axios.get(OPEN_METEO_GEOCODING, {
        params: { name: query, count: 15, language: 'en', format: 'json' },
        timeout: 6000,
      });
      providerResults = (data.results || []).map((r) => ({
        label: [r.name, r.admin1, r.country].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', '),
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        type: r.feature_code,
        country: r.country,
        city: r.name,
        source: 'open-meteo',
      }));
    } catch (err) {
      if (!providerError) providerError = err;
    }
  }

  // Never fail location search just because every external geocoder is unreachable.
  if (!providerResults.length && !catalogResults.length && providerError) {
    console.warn('Live geocoders unavailable; no matching local destinations:', providerError.message);
  }

  const seen = new Set();
  const results = [...providerResults, ...catalogResults]
    .filter((place) => {
      const key = `${Number(place.lat).toFixed(4)}:${Number(place.lng).toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);

  geocodeCache.set(q, results);
  return results;
};

// Handy links for the frontend - no API keys involved.
const mapLinks = ({ lat, lng }, label = '') => ({
  osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`,
  google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label || `${lat},${lng}`)}`,
});

module.exports = { haversineKm, estimateTravel, getTravelTime, geocode, mapLinks };
