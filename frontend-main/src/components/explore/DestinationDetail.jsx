import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, ExternalLink, Heart, MapPin, Share2, Star, Ticket } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import WeatherWidget from '../trips/WeatherWidget'
import { CATEGORY_EMOJI, ErrorBox, money, Spinner, BUDGET_LABEL } from '../ui'
import { getDestinationFallback, getDestinationImage } from '../../services/travelImages'
import { convertCurrency, normalizeCurrency } from '../../services/currency'

export default function DestinationDetail() {
  const { slug } = useParams()
  const { isAuthed, isSaved, toggleSaved, user } = useAuth()
  const { t, locale } = useLanguage()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('')

  useEffect(() => {
    setData(null)
    setError(null)
    destinationApi.get(slug).then(setData).catch(setError)
  }, [slug])

  const categories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.activities.map((a) => a.category))]
  }, [data])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorBox error={error} />
        <Link to="/explore" className="btn-secondary mt-4"><ArrowLeft size={14} /> {t('Back to explore')}</Link>
      </div>
    )
  }
  if (!data) return <Spinner label="Loading destination…" />

  const { destination: d, activities } = data
  const level = user?.preferences?.budgetLevel || 'mid'
  const saved = isSaved(d._id)
  const shown = category ? activities.filter((a) => a.category === category) : activities
  const coverImage = getDestinationImage(d)
  const currency = normalizeCurrency(user?.preferences?.currency)
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, index, 1))
  )

  const shareDestination = async () => {
    const url = `${window.location.origin}/explore/${d.slug}`
    const shareData = {
      title: `${d.name}, ${d.country}`,
      text: d.tagline || `Explore ${d.name}, ${d.country}`,
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(url)
        window.alert(t('Destination link copied'))
      }
    } catch (error) {
      if (error?.name !== 'AbortError') window.alert(t('Could not share this destination'))
    }
  }

  return (
    <div>
      <div className="relative h-[42vh] min-h-[300px] w-full overflow-hidden bg-sand">
        <img
          src={coverImage}
          alt={d.name}
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = getDestinationFallback(d)
          }}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
            <Link to="/explore" className="mb-4 inline-flex items-center gap-1 text-sm text-paper/80 hover:text-paper">
              <ArrowLeft size={14} /> {t('All destinations')}
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4 text-paper">
              <div>
                <p className="flex items-center gap-1 text-sm uppercase tracking-wider opacity-80">
                  <MapPin size={14} /> {d.country} · {d.region}
                </p>
                <h1 className="mt-1 text-5xl font-semibold sm:text-6xl">{d.name}</h1>
                <p className="mt-2 max-w-xl text-lg opacity-90">{d.tagline}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={shareDestination} className="btn bg-paper/20 text-paper backdrop-blur hover:bg-paper/30">
                  <Share2 size={16} /> {t('Share')}
                </button>
                {isAuthed && (
                  <button onClick={() => toggleSaved(d._id)} className={clsx('btn', saved ? 'bg-clay-500 text-paper' : 'bg-paper/20 text-paper backdrop-blur hover:bg-paper/30')}>
                    <Heart size={16} className={saved ? 'fill-current' : ''} /> {t(saved ? 'Saved' : 'Save')}
                  </button>
                )}
                <Link to={`/trips/new?destination=${d._id}`} className="btn bg-paper text-ink hover:bg-cream">
                  {t('Plan a trip here')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-lg leading-relaxed text-soot">{d.description}</p>

          {d.recommendation && (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-moss-100 px-3 py-1 font-semibold text-moss-700">
                {d.recommendation.score}% {t('match for you')}
              </span>
              {d.recommendation.reasons.map((r) => (
                <span key={r} className="text-soot">· {t(r)}</span>
              ))}
            </div>
          )}

          {d.localTip && (
            <div className="note mt-8">
              <span className="font-semibold text-ink">{t('Local tip.')} </span>
              {d.localTip}
            </div>
          )}

          <section className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow mb-1">{activities.length} {t('things to do')}</p>
                <h2 className="text-2xl font-semibold">{t("What we'd put on your itinerary")}</h2>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button onClick={() => setCategory('')} className={!category ? 'chip-on' : 'chip-idle'}>{t('All')}</button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={category === c ? 'chip-on' : 'chip-idle'}>
                  {CATEGORY_EMOJI[c]} {t(c)}
                </button>
              ))}
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {shown.map((a) => (
                <li key={a._id} className="card flex gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-lg">{CATEGORY_EMOJI[a.category]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-snug">{a.name}</h3>
                      <span className="flex shrink-0 items-center gap-0.5 text-xs text-soot">
                        <Star size={11} className="fill-butter text-butter" /> {a.rating}
                      </span>
                    </div>
                    {a.description && <p className="mt-1 text-sm text-soot">{a.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone">
                      <span className="flex items-center gap-1"><Clock size={11} /> {a.durationHours}h</span>
                      <span className="flex items-center gap-1"><Ticket size={11} /> {a.cost === 0 ? t('Free') : money(convertCurrency(a.cost, currency), currency, locale)}</span>
                      {a.neighborhood && <span>{a.neighborhood}</span>}
                      {a.preferredTime !== 'any' && <span className="capitalize">{t('best in the {time}', { time: t(a.preferredTime) })}</span>}
                      {a.bookingRequired && <span className="text-clay-500">{t('book ahead')}</span>}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        a.coordinates?.lat != null && a.coordinates?.lng != null
                          ? `${a.coordinates.lat},${a.coordinates.lng}`
                          : `${a.name}, ${d.name}, ${d.country}`
                      )}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-clay-600 hover:underline"
                    >
                      {t('Directions')} <ExternalLink size={11} />
                    </a>
                    <a
                      href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(`${a.name} ${d.name} ${d.country}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 ml-3 inline-flex items-center gap-1 text-xs font-semibold text-clay-600 hover:underline"
                    >
                      {t('Book tour')} <ExternalLink size={11} />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="eyebrow mb-3">{t('Daily cost, per person')}</p>
            <ul className="space-y-2">
              {Object.entries(d.dailyCost).map(([k, v]) => (
                <li key={k} className={clsx('flex items-center justify-between rounded-lg px-3 py-2 text-sm', k === level ? 'bg-ink text-paper' : 'bg-cream/60')}>
                  <span>{t(BUDGET_LABEL[k])}</span>
                  <span className="font-semibold">{money(convertCurrency(v, currency), currency, locale)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone">{t('Beds, meals, tickets and local transport. Flights not included.')}</p>
          </div>

          <div className="card p-5">
            <p className="eyebrow mb-3">{t('Best time to go')}</p>
            <div className="grid grid-cols-6 gap-1">
              {months.map((m, i) => (
                <span
                  key={m}
                  className={clsx(
                    'rounded-md py-1.5 text-center text-[11px] font-medium',
                    d.bestMonths?.includes(i + 1) ? 'bg-moss-500 text-paper' : 'bg-cream text-stone'
                  )}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <WeatherWidget coords={d.coordinates} days={7} title={t('This week there')} />

          {d.knownFor?.length > 0 && (
            <div className="card p-5">
              <p className="eyebrow mb-3">{t('Known for')}</p>
              <ul className="space-y-1.5 text-sm text-soot">
                {d.knownFor.map((k) => (
                  <li key={k} className="flex gap-2"><span className="text-clay-400">—</span>{k}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
