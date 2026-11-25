import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { creatorItineraryApi, destinationApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import { Empty, ErrorBox, PageHeader, Spinner } from '../ui'

const STOP_KINDS = ['restaurant', 'stay', 'activity', 'attraction']

const newStop = (dayNumber = 1) => ({
  name: '',
  kind: 'activity',
  address: '',
  description: '',
  bookingUrl: '',
  dayNumber,
})

const stopLocation = (stop, destination) => {
  const { lat, lng } = stop.coordinates || {}
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat},${lng}`
  return [stop.address, stop.name, destination?.name, destination?.country]
    .filter(Boolean)
    .join(', ')
}

const directionsUrl = (stops, destination) => {
  const places = stops.map((stop) => stopLocation(stop, destination)).filter(Boolean)
  if (!places.length) return ''
  if (places.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(places[0])}`
  }

  const params = new URLSearchParams({
    api: '1',
    origin: places[0],
    destination: places[places.length - 1],
    travelmode: 'walking',
  })
  if (places.length > 2) params.set('waypoints', places.slice(1, -1).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function CreatorRoutes() {
  const { isAuthed } = useAuth()
  const { t } = useLanguage()
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    creatorItineraryApi.list()
      .then((data) => {
        if (active) setItineraries(data.itineraries)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow={t('Travel from creators')}
        title={t('Creator-curated routes')}
        aside={isAuthed && (
          <Link to="/creator-routes/new" className="btn-primary">
            <Plus size={16} /> {t('Create a route')}
          </Link>
        )}
      >
        {t('Discover routes and stops selected by travel creators.')}
      </PageHeader>

      <div className="note mb-8 text-sm">
        {t('Creators review and add each stop manually from their video or blog. Bookings use creator-provided links and happen on external sites.')}
      </div>

      <ErrorBox error={error} className="mb-6" />
      {loading ? (
        <Spinner label="Loading creator routes…" />
      ) : itineraries.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {itineraries.map((itinerary) => (
            <Link
              key={itinerary._id}
              to={`/creator-routes/${itinerary._id}`}
              className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="eyebrow">{itinerary.destination?.name}, {itinerary.destination?.country}</span>
                {itinerary.status === 'draft' && (
                  <span className="rounded-full bg-butter/50 px-2 py-0.5 text-xs">{t('Draft')}</span>
                )}
              </div>
              <h2 className="mt-3 text-xl font-semibold group-hover:text-clay-700">{itinerary.title}</h2>
              {itinerary.description && <p className="mt-2 line-clamp-3 text-sm text-soot">{itinerary.description}</p>}
              <p className="mt-4 text-xs text-stone">
                {itinerary.stops.length} {t('stops')} · {t('by')} {itinerary.creator?.name || t('Travel creator')}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No creator routes yet" illustration="🗺">
          {t('Create a route from a travel video or blog by adding its confirmed stops and booking links.')}
          {isAuthed && (
            <div className="mt-5">
              <Link to="/creator-routes/new" className="btn-primary">
                <Plus size={16} /> {t('Create a route')}
              </Link>
            </div>
          )}
        </Empty>
      )}
    </div>
  )
}

export function CreatorRouteDetail() {
  const { id } = useParams()
  const { user, isAuthed } = useAuth()
  const { t } = useLanguage()
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    creatorItineraryApi.get(id)
      .then(({ itinerary: result }) => {
        if (active) setItinerary(result)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id])

  if (loading) return <Spinner label="Loading creator route…" />
  if (error || !itinerary) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ErrorBox error={error || t('Creator route not found')} />
        <Link to="/creator-routes" className="btn-secondary mt-4"><ArrowLeft size={14} /> {t('Back to creator routes')}</Link>
      </div>
    )
  }

  const isOwner = isAuthed && String(itinerary.creator?._id) === String(user?._id)
  const days = itinerary.stops.reduce((grouped, stop) => {
    const day = stop.dayNumber || 1
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(stop)
    return grouped
  }, {})

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/creator-routes" className="mb-5 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
        <ArrowLeft size={14} /> {t('Back to creator routes')}
      </Link>
      <PageHeader
        eyebrow={`${itinerary.destination?.name || ''}, ${itinerary.destination?.country || ''}`}
        title={itinerary.title}
        aside={isOwner && (
          <Link to={`/creator-routes/${itinerary._id}/edit`} className="btn-secondary">
            {t('Edit route')}
          </Link>
        )}
      >
        {itinerary.description}
      </PageHeader>

      <div className="card mb-8 flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-sm text-soot">{t('Curated by')} {itinerary.creator?.name || t('Travel creator')}</span>
        <a href={itinerary.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700 hover:underline">
          {t('View original video or blog')} <ExternalLink size={14} />
        </a>
      </div>

      <div className="note mb-6 text-sm">
        {t('Check stop details, availability, and booking terms with each provider. Smart Travel does not process these bookings.')}
      </div>

      <div className="space-y-6">
        {Object.keys(days).map(Number).sort((a, b) => a - b).map((dayNumber) => {
          const stops = days[dayNumber]
          const routeUrl = directionsUrl(stops, itinerary.destination)
          return (
            <section key={dayNumber} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/60 bg-cream/40 px-5 py-4">
                <h2 className="font-display text-2xl font-semibold">{t('Day')} {dayNumber}</h2>
                {routeUrl && (
                  <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 text-xs">
                    <MapPin size={14} /> {t('Open route in Maps')} <ExternalLink size={12} />
                  </a>
                )}
              </header>
              <ol className="divide-y divide-sand/50">
                {stops.map((stop, index) => (
                  <li key={stop._id || `${dayNumber}-${index}`} className="flex gap-4 p-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-100 text-sm font-semibold text-clay-800">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone">{t(stop.kind)}</p>
                      <h3 className="mt-1 text-lg font-semibold">{stop.name}</h3>
                      <p className="mt-1 text-sm text-soot">{stop.address}</p>
                      {stop.description && <p className="mt-2 text-sm text-soot">{stop.description}</p>}
                      {stop.bookingUrl ? (
                        <a href={stop.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 !py-1.5 text-sm">
                          {t('Book this stop')} <ExternalLink size={14} />
                        </a>
                      ) : (
                        <p className="mt-3 text-xs text-stone">{t('No booking link provided for this stop.')}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function CreatorRouteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const formRef = useRef(null)
  const [destinations, setDestinations] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    destination: '',
    sourceUrl: '',
  })
  const [stops, setStops] = useState([newStop()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const destinationData = await destinationApi.list({ sort: 'name' })
        if (active) setDestinations(destinationData.destinations)

        if (id) {
          const { itinerary } = await creatorItineraryApi.get(id)
          if (active) {
            setForm({
              title: itinerary.title,
              description: itinerary.description || '',
              destination: itinerary.destination?._id || '',
              sourceUrl: itinerary.sourceUrl,
              status: itinerary.status,
            })
            setStops(itinerary.stops.map((stop) => ({
              name: stop.name,
              kind: stop.kind,
              address: stop.address,
              description: stop.description || '',
              bookingUrl: stop.bookingUrl || '',
              dayNumber: stop.dayNumber || 1,
              coordinates: stop.coordinates,
            })))
          }
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [id])

  const routeIsPublished = form.status === 'published'

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateStop = (index, patch) => {
    setStops((current) => current.map((stop, stopIndex) => (
      stopIndex === index ? { ...stop, ...patch } : stop
    )))
  }

  const saveRoute = async (status) => {
    if (saving || !formRef.current?.reportValidity()) return
    if (status === 'published' && !stops.length) {
      setError(t('Add at least one stop before publishing.'))
      return
    }

    setSaving(true)
    setError('')
    const body = { ...form, stops, status }
    try {
      const result = id
        ? await creatorItineraryApi.update(id, body)
        : await creatorItineraryApi.create(body)
      navigate(`/creator-routes/${result._id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Loading route editor…" />

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/creator-routes" className="mb-5 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
        <ArrowLeft size={14} /> {t('Back to creator routes')}
      </Link>
      <PageHeader
        eyebrow={t('Creator tools')}
        title={id ? t('Edit curated route') : t('Create a curated route')}
      >
        {t('Add the source and manually confirm every venue, address, and booking link. Smart Travel does not scrape or book from the source.')}
      </PageHeader>

      {routeIsPublished && (
        <div className="note mb-5 text-sm">{t('This route is public. Saving changes keeps it published.')}</div>
      )}
      <ErrorBox error={error} className="mb-5" />

      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); saveRoute('published') }} className="space-y-6">
        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">{t('Route details')}</h2>
          <div>
            <label className="label" htmlFor="creator-route-title">{t('Route title')}</label>
            <input id="creator-route-title" className="input" value={form.title} onChange={(event) => updateForm('title', event.target.value)} required maxLength={100} />
          </div>
          <div>
            <label className="label" htmlFor="creator-route-destination">{t('Destination')}</label>
            <select id="creator-route-destination" className="input" value={form.destination} onChange={(event) => updateForm('destination', event.target.value)} required>
              <option value="">{t('Choose a destination')}</option>
              {destinations.map((destination) => (
                <option key={destination._id} value={destination._id}>{destination.name}, {destination.country}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="creator-route-source">{t('Original video or blog URL')}</label>
            <input
              id="creator-route-source"
              type="url"
              inputMode="url"
              pattern="https://.*"
              className="input"
              value={form.sourceUrl}
              onChange={(event) => updateForm('sourceUrl', event.target.value)}
              placeholder="https://…"
              required
              maxLength={2048}
            />
            <p className="mt-1 text-xs text-stone">{t('Paste the public link. You will review and enter the route stops yourself.')}</p>
          </div>
          <div>
            <label className="label" htmlFor="creator-route-description">{t('Introduction')}</label>
            <textarea id="creator-route-description" className="input min-h-24" value={form.description} onChange={(event) => updateForm('description', event.target.value)} maxLength={1000} />
          </div>
        </section>

        <section className="card space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{t('Confirmed route stops')}</h2>
              <p className="mt-1 text-sm text-soot">{t('Use the exact place name and address. Add a direct HTTPS booking link when available.')}</p>
            </div>
            <button type="button" className="btn-secondary !py-1.5 text-sm" onClick={() => setStops((current) => [...current, newStop(current.at(-1)?.dayNumber || 1)])} disabled={stops.length >= 30}>
              <Plus size={15} /> {t('Add stop')}
            </button>
          </div>

          {stops.map((stop, index) => (
            <fieldset key={index} className="rounded-xl border border-sand p-4">
              <legend className="px-2 text-sm font-semibold">{t('Stop')} {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor={`stop-name-${index}`}>{t('Place name')}</label>
                  <input id={`stop-name-${index}`} className="input" value={stop.name} onChange={(event) => updateStop(index, { name: event.target.value })} required maxLength={120} />
                </div>
                <div>
                  <label className="label" htmlFor={`stop-kind-${index}`}>{t('Type')}</label>
                  <select id={`stop-kind-${index}`} className="input" value={stop.kind} onChange={(event) => updateStop(index, { kind: event.target.value })}>
                    {STOP_KINDS.map((kind) => <option key={kind} value={kind}>{t(kind)}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor={`stop-address-${index}`}>{t('Exact address')}</label>
                  <input id={`stop-address-${index}`} className="input" value={stop.address} onChange={(event) => updateStop(index, { address: event.target.value })} required maxLength={250} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor={`stop-description-${index}`}>{t('Notes')}</label>
                  <textarea id={`stop-description-${index}`} className="input min-h-20" value={stop.description} onChange={(event) => updateStop(index, { description: event.target.value })} maxLength={500} />
                </div>
                <div>
                  <label className="label" htmlFor={`stop-booking-${index}`}>{t('Booking URL (optional)')}</label>
                  <input id={`stop-booking-${index}`} type="url" pattern="https://.*" className="input" value={stop.bookingUrl} onChange={(event) => updateStop(index, { bookingUrl: event.target.value })} placeholder="https://…" maxLength={2048} />
                </div>
                <div>
                  <label className="label" htmlFor={`stop-day-${index}`}>{t('Day number')}</label>
                  <input id={`stop-day-${index}`} type="number" className="input" value={stop.dayNumber} onChange={(event) => updateStop(index, { dayNumber: Number(event.target.value) })} required min={1} max={30} />
                </div>
              </div>
              <button type="button" className="btn-ghost mt-3 !px-2 text-xs text-clay-700" onClick={() => setStops((current) => current.filter((_, stopIndex) => stopIndex !== index))}>
                <Trash2 size={13} /> {t('Remove stop')}
              </button>
            </fieldset>
          ))}
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => saveRoute('draft')}>
            <Save size={15} /> {saving ? t('Saving…') : t('Save draft')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <ExternalLink size={15} /> {saving ? t('Saving…') : id && routeIsPublished ? t('Save and publish') : t('Publish route')}
          </button>
        </div>
      </form>
    </div>
  )
}
