import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { externalApi } from '../../services/api'

const ICONS = {
  sun: Sun,
  'sun-cloud': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
}

export function WeatherIcon({ icon, size = 18, className }) {
  const Icon = ICONS[icon] || Cloud
  return <Icon size={size} className={className} />
}

// Standalone forecast card - fetches its own data from our weather proxy.
export default function WeatherWidget({ coords, days = 7, title = 'Weather' }) {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    if (!coords?.lat) return
    setState({ loading: true })
    externalApi
      .weather(coords.lat, coords.lng, days)
      .then((data) => setState({ data }))
      .catch((err) => setState({ error: err.message }))
  }, [coords?.lat, coords?.lng, days])

  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">{title}</p>
      {state.loading && <p className="text-sm text-stone animate-pulse">Checking the skies…</p>}
      {state.error && <p className="text-sm text-stone">Forecast unavailable right now.</p>}
      {state.data && <ForecastStrip forecast={state.data.forecast} hint={state.data.hint} />}
    </div>
  )
}

export function ForecastStrip({ forecast, hint, daily }) {
  const list = daily || forecast?.daily || []
  return (
    <div>
      {forecast?.current && (
        <div className="mb-4 flex items-center gap-3">
          <WeatherIcon icon={forecast.current.icon} size={32} className="text-clay-500" />
          <div>
            <p className="font-display text-3xl font-semibold leading-none">{forecast.current.temp}°</p>
            <p className="text-xs text-soot">{forecast.current.label} · now</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-1 text-center">
        {list.slice(0, 7).map((d) => (
          <div key={d.date} className="rounded-lg bg-cream/60 px-1 py-2">
            <p className="text-[10px] uppercase text-stone">{format(parseISO(d.date), 'EEE')}</p>
            <WeatherIcon icon={d.icon} size={16} className="mx-auto my-1 text-soot" />
            <p className="text-xs font-semibold">{d.high}°</p>
            <p className="text-[10px] text-stone">{d.low}°</p>
          </div>
        ))}
      </div>
      {hint && <p className="mt-3 text-xs italic text-soot">{hint}</p>}
    </div>
  )
}
