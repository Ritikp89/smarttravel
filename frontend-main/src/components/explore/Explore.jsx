import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, MapPin } from 'lucide-react'
import { destinationApi, externalApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import DestinationCard from './DestinationCard'
import FilterBar from './FilterBar'
import VerifiedTravelOptions from './VerifiedTravelOptions'
import { Empty, ErrorBox, PageHeader, Spinner } from '../ui'

export default function Explore() {
  const { user, isAuthed } = useAuth()
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [tags, setTags] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [worldwidePlaces, setWorldwidePlaces] = useState([])
  const [worldwideSearch, setWorldwideSearch] = useState('')
  const [worldwideLoading, setWorldwideLoading] = useState(false)
  const [worldwideError, setWorldwideError] = useState(null)
  const worldwideRequest = useRef(0)
  const worldwideSection = useRef(null)

  const filters = useMemo(
    () => ({
      q: params.get('q') || '',
      region: params.get('region') || '',
      tag: params.get('tag') || '',
      sort: params.get('sort') || 'popular',
    }),
    [params]
  )

  const setFilters = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== 'popular'))
    setParams(clean, { replace: true })
  }

  useEffect(() => {
    worldwideRequest.current += 1
    setWorldwidePlaces([])
    setWorldwideSearch('')
    setWorldwideError(null)
    setWorldwideLoading(false)
  }, [filters.q])

  useEffect(() => {
    destinationApi.tags().then(setTags).catch(() => {})
  }, [])

  // debounce the search box a touch so we're not hammering the API per keystroke
  useEffect(() => {
    setLoading(true)
    setError(null)
    const t = setTimeout(() => {
      destinationApi
        .list({ ...filters, budgetLevel: user?.preferences?.budgetLevel })
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false))
    }, filters.q ? 300 : 0)
    return () => clearTimeout(t)
  }, [filters, user?.preferences?.budgetLevel])

  const list = data?.destinations || []
  const searchWorldwide = async () => {
    const query = filters.q.trim()
    if (query.length < 2 || !isAuthed) return

    const requestId = ++worldwideRequest.current
    setWorldwideLoading(true)
    setWorldwideError(null)
    setWorldwideSearch(query)
    try {
      const places = await externalApi.geocode(query)
      if (requestId === worldwideRequest.current) setWorldwidePlaces(places)
    } catch (err) {
      if (requestId === worldwideRequest.current) {
        setWorldwidePlaces([])
        setWorldwideError(err.message)
      }
    } finally {
      if (requestId === worldwideRequest.current) {
        setWorldwideLoading(false)
        window.requestAnimationFrame(() => worldwideSection.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      }
    }
  }

  const planWorldwidePlace = (place) => {
    navigate('/trips/new', { state: { destinationPlace: place } })
  }

  const removeDestination = async (destination) => {
    try {
      await destinationApi.remove(destination._id)
      setData((current) => current
        ? { ...current, count: Math.max(0, current.count - 1), destinations: current.destinations.filter((item) => item._id !== destination._id) }
        : current
      )
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Explore" title="Where to next?">
        {user?.preferences?.interests?.length
          ? t('Match scores are based on your interest in {interests}.', { interests: user.preferences.interests.slice(0, 3).map((interest) => t(interest)).join(', ') })
          : 'Explore destinations around the world, with practical costs and local highlights. Log in to see how each one matches you.'}
      </PageHeader>

      <FilterBar
        filters={filters}
        tags={tags}
        onChange={setFilters}
        onSearchWorldwide={searchWorldwide}
        worldwideLoading={worldwideLoading}
        isAuthed={isAuthed}
      />
      <div className="mt-6">
        <VerifiedTravelOptions />
      </div>

      <div className="mt-8">
        {loading && !data ? (
          <Spinner label="Fetching destinations…" />
        ) : error ? (
          <ErrorBox error={error} onRetry={() => setFilters({ ...filters })} />
        ) : list.length === 0 ? (
          <Empty title="Nothing matched that" illustration="🗺">
            Try a broader search, or clear the filters. We're adding destinations as we go.
          </Empty>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone">
              {t(list.length === 1 ? '{count} place' : '{count} places', { count: list.length })}
              {filters.tag && <> {t('tagged')} <span className="text-ink">{t(filters.tag)}</span></>}
              {loading && <span className="ml-2 animate-pulse">{t('updating…')}</span>}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => (
                <DestinationCard key={d._id} destination={d} onDelete={removeDestination} />
              ))}
            </div>
          </>
        )}
      </div>

      <section ref={worldwideSection} className="mt-8 rounded-2xl border border-sand bg-paper p-5 sm:p-6" aria-label={t('Worldwide location search')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">{t('Search locations worldwide')}</h2>
            <p className="mt-1 text-sm text-stone">{t('Find cities and places beyond our curated destination list.')}</p>
          </div>
        </div>

        {worldwideError && <p role="alert" className="mt-4 text-sm text-clay-700">{worldwideError}</p>}
        {worldwideSearch && !worldwideLoading && !worldwideError && worldwidePlaces.length === 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-stone">{t('No worldwide locations found for “{query}”. Try a city, region, or landmark.', { query: worldwideSearch })}</p>
            <a
              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(worldwideSearch)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              {t('Search this keyword on OpenStreetMap')} <ExternalLink size={14} />
            </a>
          </div>
        )}
        {worldwidePlaces.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-stone">{t('Worldwide matches for “{query}”', { query: worldwideSearch })}</p>
            <ul className="divide-y divide-sand rounded-xl border border-sand">
              {worldwidePlaces.map((place, index) => (
                <li key={`${place.lat}-${place.lng}-${index}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <MapPin size={17} className="mt-0.5 shrink-0 text-moss-600" />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{place.city || place.label.split(',')[0]}</p>
                      <p className="text-sm text-stone">{place.label}</p>
                    </div>
                  </div>
                  {isAuthed && (
                    <button type="button" onClick={() => planWorldwidePlace(place)} className="btn-secondary shrink-0">
                      Plan a trip <ArrowRight size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {worldwidePlaces.some((place) => place.source === 'openstreetmap') && (
              <p className="mt-3 text-xs text-stone">{t('Map data includes OpenStreetMap contributors.')}</p>
            )}
            {worldwidePlaces.some((place) => place.source === 'open-meteo') && (
              <p className="mt-3 text-xs text-stone">{t('Location data from GeoNames via Open-Meteo.')}</p>
            )}
            {worldwidePlaces.some((place) => place.source === 'catalog') && (
              <p className="mt-3 text-xs text-stone">{t('Matches also include the Smart Travel destination catalog.')}</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
