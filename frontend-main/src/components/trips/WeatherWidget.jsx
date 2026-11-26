import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react'
import { parseISO } from 'date-fns'
import { externalApi } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'
import { formatDate } from '../ui'

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
export default function WeatherWidget({ coords, days = 7, title = 'Live forecast', location = '' }) {
  const { t } = useLanguage()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    const lat = Number(coords?.lat)
    const lng = Number(coords?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setState({ error: true })
      return
    }

    let active = true
    setState({ loading: true })
    externalApi
      .weather(lat, lng, days)
      .then((data) => { if (active) setState({ data }) })
      .catch(() => { if (active) setState({ error: true }) })

    return () => { active = false }
  }, [coords?.lat, coords?.lng, days])

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{t(title)}</p>
          {location && <p className="mt-1 text-sm font-medium text-ink">{location}</p>}
        </div>
        {state.data && <span className="rounded-full bg-moss-100 px-2 py-1 text-[10px] font-semibold text-moss-700">{t('Live')}</span>}
      </div>
      {state.loading && <p className="text-sm text-stone animate-pulse">{t('Checking the skies…')}</p>}
      {state.error && <p className="text-sm text-stone">{t('Forecast unavailable right now.')}</p>}
      {state.data && <ForecastStrip forecast={state.data.forecast} hint={state.data.hint} />}
    </div>
  )
}

export function ForecastStrip({ forecast, hint, daily }) {
  const { locale, t } = useLanguage()
  const list = daily || forecast?.daily || []
  const updatedAt = forecast?.updatedAt ? formatDate(forecast.updatedAt, 'p', locale) : null
  return (
    <div>
      {forecast?.current && (
        <div className="mb-4 flex items-center gap-3">
          <WeatherIcon icon={forecast.current.icon} size={32} className="text-clay-500" />
          <div>
            <p className="font-display text-3xl font-semibold leading-none">{forecast.current.temp}°</p>
            <p className="text-xs text-soot">{t(forecast.current.label)} · {t('now')}</p>
          </div>
        </div>
      )}
      {forecast?.current && (
        <div className="mb-3 flex gap-3 text-xs text-stone">
          {forecast.current.humidity != null && <span>{t('Humidity')} {forecast.current.humidity}%</span>}
          {forecast.current.windKph != null && <span>{t('Wind')} {forecast.current.windKph} km/h</span>}
        </div>
      )}
      <div className="grid grid-cols-7 gap-1 text-center">
        {list.slice(0, 7).map((d) => (
          <div key={d.date} className="rounded-lg bg-cream/60 px-1 py-2">
            <p className="text-[10px] uppercase text-stone">{formatDate(parseISO(d.date), 'EEE', locale)}</p>
            <WeatherIcon icon={d.icon} size={16} className="mx-auto my-1 text-soot" />
            {d.rainChance != null && <p className="text-[9px] text-sky-700">{t('Rain')} {d.rainChance}%</p>}
            <p className="text-xs font-semibold">{d.high}°</p>
            <p className="text-[10px] text-stone">{d.low}°</p>
          </div>
        ))}
      </div>
      {hint && <p className="mt-3 text-xs italic text-soot">{t(hint)}</p>}
      {updatedAt && <p className="mt-2 text-[10px] text-stone">{t('Updated {time}', { time: updatedAt })}</p>}
    </div>
  )
}
