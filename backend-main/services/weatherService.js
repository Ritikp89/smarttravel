const axios = require('axios');

// Open-Meteo is free and needs no key, so it's the default. If OPENWEATHER_API_KEY is set
// we still use Open-Meteo for the forecast but it's a straightforward swap if you prefer OWM.
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

const cache = new Map();
const TTL_MS = 30 * 60 * 1000;

// WMO weather interpretation codes -> something a human wants to read
const describeCode = (code) => {
  if (code === 0) return { label: 'Clear sky', icon: 'sun' };
  if (code <= 2) return { label: 'Mostly clear', icon: 'sun-cloud' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code <= 48) return { label: 'Foggy', icon: 'fog' };
  if (code <= 57) return { label: 'Drizzle', icon: 'drizzle' };
  if (code <= 67) return { label: 'Rain', icon: 'rain' };
  if (code <= 77) return { label: 'Snow', icon: 'snow' };
  if (code <= 82) return { label: 'Showers', icon: 'rain' };
  if (code <= 86) return { label: 'Snow showers', icon: 'snow' };
  return { label: 'Thunderstorm', icon: 'storm' };
};

const getForecast = async ({ lat, lng }, days = 7) => {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${days}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const { data } = await axios.get(OPEN_METEO, {
    params: {
      latitude: lat,
      longitude: lng,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
      timezone: 'auto',
      forecast_days: Math.min(16, Math.max(1, days)),
    },
    timeout: 8000,
  });

  const result = {
    timezone: data.timezone,
    current: {
      temp: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      windKph: Math.round(data.current.wind_speed_10m),
      ...describeCode(data.current.weather_code),
    },
    daily: data.daily.time.map((date, i) => ({
      date,
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      rainChance: data.daily.precipitation_probability_max[i],
      ...describeCode(data.daily.weather_code[i]),
    })),
    source: 'open-meteo',
  };

  cache.set(key, { at: Date.now(), data: result });
  return result;
};

// A one-liner the itinerary page can show: "Pack a rain jacket, 3 of 5 days look wet."
const packingHint = (forecast) => {
  if (!forecast?.daily?.length) return null;
  const wet = forecast.daily.filter((d) => d.rainChance >= 50).length;
  const hot = forecast.daily.filter((d) => d.high >= 30).length;
  const cold = forecast.daily.filter((d) => d.low <= 5).length;
  const n = forecast.daily.length;

  if (cold >= n / 2) return 'Proper coat weather - pack layers and something warm for the evenings.';
  if (wet >= n / 2) return `Rain jacket territory: ${wet} of ${n} days look wet.`;
  if (hot >= n / 2) return 'Expect heat. Light clothes, sunscreen, and plan indoor stuff for early afternoon.';
  if (wet > 0) return `Mostly fine, though ${wet} day${wet > 1 ? 's' : ''} might see rain.`;
  return 'Looks pleasant all week. Lucky you.';
};

module.exports = { getForecast, packingHint, describeCode };
