import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { Check, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi, tripApi, itineraryApi, budgetApi, externalApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import { convertCurrency } from '../../services/currency'
import { BUDGET_LABEL, ErrorBox, INTERESTS, PACE_LABEL, TRAVEL_STYLES, PageHeader, money, Spinner } from '../ui'
import { getDestinationFallback, getDestinationImage } from '../../services/travelImages'

const PACE_HELP = {
  relaxed: 'One or two things a day. Long lunches.',
  balanced: 'A proper morning and afternoon, evenings free-ish.',
  packed: 'Up early, back late, see everything.',
}

const CUSTOM_DESTINATION_DAILY_COST = { budget: 80, mid: 150, luxury: 300 }

const INDIAN_PLACES = [
  ['New Delhi', 28.6139, 77.2090, ['Delhi', '\u0926\u093f\u0932\u094d\u0932\u0940', '\u0928\u094d\u092f\u0942 \u0926\u093f\u0932\u094d\u0932\u0940']],
  ['Mumbai', 19.0760, 72.8777, ['Bombay', '\u092e\u0941\u0902\u092c\u0908']],
  ['Jaipur', 26.9124, 75.7873, ['\u091c\u092f\u092a\u0941\u0930']],
  ['Goa', 15.2993, 74.1240, []],
  ['Bengaluru', 12.9716, 77.5946, ['Bangalore', '\u092c\u0947\u0902\u0917\u0932\u0941\u0930\u0941']],
  ['Chennai', 13.0827, 80.2707, ['Madras', '\u091a\u0947\u0928\u094d\u0928\u0908']],
  ['Kolkata', 22.5726, 88.3639, ['Calcutta', '\u0915\u094b\u0932\u0915\u093e\u0924\u093e']],
  ['Hyderabad', 17.3850, 78.4867, ['\u0939\u0948\u0926\u0930\u093e\u092c\u093e\u0926']],
  ['Pune', 18.5204, 73.8567, ['\u092a\u0941\u0923\u0947']],
  ['Ahmedabad', 23.0225, 72.5714, ['\u0905\u0939\u092e\u0926\u093e\u092c\u093e\u0926']],
  ['Varanasi', 25.3176, 82.9739, ['Benares', '\u0935\u093e\u0930\u093e\u0923\u0938\u0940']],
  ['Agra', 27.1767, 78.0081, ['\u0906\u0917\u0930\u093e']],
  ['Kochi', 9.9312, 76.2673, ['Cochin']],
  ['Amritsar', 31.6340, 74.8723, []],
  ['Rishikesh', 30.0869, 78.2676, []],
  ['Shimla', 31.1048, 77.1734, []],
  ['Srinagar', 34.0837, 74.7973, []],
  ['Udaipur', 24.5854, 73.7125, []],
  ['Jodhpur', 26.2389, 73.0243, []],
  ['Jaisalmer', 26.9157, 70.9083, []],
  ['Mysuru', 12.2958, 76.6394, ['Mysore']],
  ['Madurai', 9.9252, 78.1198, []],
  ['Ooty', 11.4064, 76.6932, ['Udhagamandalam']],
  ['Munnar', 10.0889, 77.0595, []],
  ['Hampi', 15.3350, 76.4600, []],
  ['Puducherry', 11.9416, 79.8083, ['Pondicherry']],
  ['Port Blair', 11.6234, 92.7265, []],
  ['Guwahati', 26.1445, 91.7362, []],
  ['Bhubaneswar', 20.2961, 85.8245, []],
  ['Lucknow', 26.8467, 80.9462, []],
  ['Indore', 22.7196, 75.8577, []],
  ['Bhopal', 23.2599, 77.4126, []],
  ['Darjeeling', 27.0410, 88.2663, []],
  ['Kodaikanal', 10.2381, 77.4892, []],
  ['Kanyakumari', 8.0883, 77.5385, ['Cape Comorin']],
  ['Tirupati', 13.6288, 79.4192, []],
  ['Mahabalipuram', 12.6208, 80.1945, ['Mamallapuram']],
  ['Dharamshala', 32.2190, 76.3234, ['McLeod Ganj', 'Mcleodganj']],
  ['Leh', 34.1526, 77.5771, ['Ladakh']],
  ['Spiti Valley', 32.2460, 78.0349, ['Spiti']],
].map(([city, lat, lng, aliases]) => ({
  label: `${city}, India`,
  city,
  country: 'India',
  lat,
  lng,
  type: 'city',
  source: 'local-india',
  aliases,
}))

const findIndianPlaces = (query) => {
  const terms = query.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return []

  return INDIAN_PLACES.filter((place) => {
    const searchable = [place.city, place.country, ...place.aliases].join(' ').toLocaleLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}

const mergePlaceSuggestions = (localPlaces, remotePlaces) => {
  const keys = new Set(localPlaces.map((place) => `${place.city?.toLocaleLowerCase()}|${place.country?.toLocaleLowerCase()}`))
  const coords = new Set(localPlaces.map((place) => `${place.lat.toFixed(2)}:${place.lng.toFixed(2)}`))
  const merged = [...localPlaces]
  remotePlaces.forEach((place) => {
    const key = `${place.city?.toLocaleLowerCase()}|${place.country?.toLocaleLowerCase()}`
    const coordKey = `${Number(place.lat).toFixed(2)}:${Number(place.lng).toFixed(2)}`
    if (keys.has(key) || coords.has(coordKey)) return
    keys.add(key)
    coords.add(coordKey)
    merged.push(place)
  })
  return merged
}

export default function NewTrip() {
  const { user } = useAuth()
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const initialPlace = location.state?.destinationPlace || null

  const [destinations, setDestinations] = useState(null)
  const [destinationQuery, setDestinationQuery] = useState(() => initialPlace?.label || '')
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [destinationHighlighted, setDestinationHighlighted] = useState(0)
  const [placeSuggestions, setPlaceSuggestions] = useState([])
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false)
  const [destinationPlace, setDestinationPlace] = useState(initialPlace)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('') // what we're doing during submit

  const [form, setForm] = useState(() => ({
    destination: params.get('destination') || '',
    originCity: user?.preferences?.homeCity || '',
    title: '',
    startDate: format(addDays(new Date(), 21), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 25), 'yyyy-MM-dd'),
    travelers: 2,
    budgetLevel: user?.preferences?.budgetLevel || 'mid',
    pace: user?.preferences?.travelPace || 'balanced',
    interests: user?.preferences?.interests || [],
    travelStyle: '',
    notes: '',
    autoGenerate: true,
  }))

  useEffect(() => {
    destinationApi
      .list({ sort: 'name' })
      .then((d) => {
        setDestinations(d.destinations)
        const preselected = d.destinations.find((destination) => destination._id === params.get('destination'))
        if (preselected) setDestinationQuery(`${preselected.name}, ${preselected.country}`)
      })
      .catch(setError)
  }, [params])

  useEffect(() => {
    const query = destinationQuery.trim()
    if (!destinationOpen || query.length < 2 || form.destination) {
      setPlaceSuggestions([])
      setPlaceSearchLoading(false)
      return
    }

    const localPlaces = findIndianPlaces(query)
    setPlaceSuggestions(localPlaces)
    let active = true
    setPlaceSearchLoading(true)
    const timer = window.setTimeout(() => {
      externalApi.geocode(query)
        .then((results) => {
          if (active) setPlaceSuggestions(mergePlaceSuggestions(localPlaces, results))
        })
        .catch(() => {
          if (active) setPlaceSuggestions(localPlaces)
        })
        .finally(() => {
          if (active) setPlaceSearchLoading(false)
        })
    }, 350)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [destinationQuery, destinationOpen, form.destination])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const selected = useMemo(() => destinations?.find((d) => d._id === form.destination), [destinations, form.destination])
  const destinationSuggestions = useMemo(() => {
    if (!destinations) return []
    const query = destinationQuery.trim().toLowerCase()
    if (!query) return destinations.slice(0, 8)

    return destinations
      .filter((d) => [d.name, d.country, d.region, d.tagline, ...(d.tags || [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)))
      .slice(0, 8)
  }, [destinations, destinationQuery])
  const locationSuggestions = useMemo(() => [
    ...destinationSuggestions.map((destination) => ({ kind: 'destination', value: destination })),
    ...placeSuggestions
      .filter((place) => !destinationSuggestions.some((destination) =>
        destination.name?.toLocaleLowerCase() === place.city?.toLocaleLowerCase()
        && destination.country?.toLocaleLowerCase() === place.country?.toLocaleLowerCase()
      ))
      .map((place) => ({ kind: 'place', value: place })),
  ], [destinationSuggestions, placeSuggestions])

  const days = Math.max(0, differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1)
  const estimateCurrency = user?.preferences?.currency || 'INR'
  const dailyCostEstimate = selected?.dailyCost?.[form.budgetLevel]
    ?? (destinationPlace ? CUSTOM_DESTINATION_DAILY_COST[form.budgetLevel] : null)
  const roughSubtotal = dailyCostEstimate != null && days > 0
    ? dailyCostEstimate * (
      0.9 * Math.max(1, days - 1) * Math.ceil(Number(form.travelers) / 2)
      + 0.7 * days * Number(form.travelers)
    )
    : null
  const roughCost = roughSubtotal == null
    ? null
    : convertCurrency(roughSubtotal * 1.1, estimateCurrency)

  const chooseDestination = (destination) => {
    set({ destination: destination._id })
    setDestinationPlace(null)
    setDestinationQuery(`${destination.name}, ${destination.country}`)
    setDestinationOpen(false)
  }

  const choosePlace = (place) => {
    set({ destination: '' })
    setDestinationPlace(place)
    setDestinationQuery(place.label)
    setDestinationOpen(false)
  }

  const handleDestinationKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setDestinationOpen(true)
      setDestinationHighlighted((current) => Math.min(current + 1, Math.max(0, locationSuggestions.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setDestinationHighlighted((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && destinationOpen && locationSuggestions[destinationHighlighted]) {
      event.preventDefault()
      const suggestion = locationSuggestions[destinationHighlighted]
      if (suggestion.kind === 'destination') chooseDestination(suggestion.value)
      else choosePlace(suggestion.value)
    } else if (event.key === 'Escape') {
      setDestinationOpen(false)
    }
  }

  const toggleInterest = (i) =>
    set({ interests: form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i] })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.destination && !destinationPlace && !destinationQuery.trim()) return setError('Pick or type a destination first')
    if (days < 1) return setError('The end date needs to be on or after the start date')
    if (days > 30) return setError('We cap trips at 30 days - split a longer one into two')

    setBusy(true)
    setError(null)
    try {
      setStage('Saving your trip…')
      const trip = await tripApi.create({
        destination: form.destination || undefined,
        destinationName: !form.destination ? destinationQuery.trim() : undefined,
        destinationPlace: !form.destination ? destinationPlace : undefined,
        originCity: form.originCity.trim() || undefined,
        title: form.title.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        travelers: Number(form.travelers),
        budgetLevel: form.budgetLevel,
        pace: form.pace,
        interests: form.interests,
        travelStyle: form.travelStyle || undefined,
        notes: form.notes.trim() || undefined,
      })

      if (form.autoGenerate) {
        setStage('Packing your days…')
        await itineraryApi.generate(trip._id).catch(() => {})
        setStage('Adding up the costs…')
        await budgetApi.estimate(trip._id).catch(() => {})
      }

      navigate(`/trips/${trip._id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
      setStage('')
    }
  }

  if (!destinations && !error) return <Spinner label="Loading destinations…" />

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="New trip" title="Let's plan something">
        Fill in the basics and we'll draft an itinerary and a budget straight away. Everything is editable after.
      </PageHeader>

      <form onSubmit={submit} className="space-y-8">
        <ErrorBox error={error} />

        {/* destination */}
        <section>
          <label className="label" htmlFor="destination">{t('Where to')}</label>
          <div className="relative">
            <input
              id="destination"
              className="input"
              value={destinationQuery}
              placeholder={t('Search a city, landmark or address...')}
              autoComplete="off"
              role="combobox"
              aria-expanded={destinationOpen}
              aria-controls="destination-suggestions"
              aria-autocomplete="list"
              aria-busy={placeSearchLoading}
              aria-activedescendant={destinationOpen && locationSuggestions[destinationHighlighted]
                ? `destination-suggestion-${destinationHighlighted}`
                : undefined}
              onFocus={() => setDestinationOpen(true)}
              onChange={(e) => {
                setDestinationQuery(e.target.value)
                set({ destination: '' })
                setDestinationPlace(null)
                setPlaceSuggestions([])
                setDestinationHighlighted(0)
                setDestinationOpen(true)
              }}
              onKeyDown={handleDestinationKeyDown}
              onBlur={() => window.setTimeout(() => setDestinationOpen(false), 100)}
            />
            {destinationOpen && (locationSuggestions.length > 0 || placeSearchLoading) && (
              <div
                id="destination-suggestions"
                role="listbox"
                className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-sand bg-white p-1 shadow-soft"
              >
                {locationSuggestions.map(({ kind, value }, index) => (
                  <button
                    type="button"
                    role="option"
                    id={`destination-suggestion-${index}`}
                    aria-selected={destinationHighlighted === index}
                    key={kind === 'destination' ? `destination-${value._id}` : `place-${value.lat}-${value.lng}-${value.label}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setDestinationHighlighted(index)}
                    onClick={() => kind === 'destination' ? chooseDestination(value) : choosePlace(value)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left',
                      destinationHighlighted === index ? 'bg-cream' : 'hover:bg-cream/70'
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {kind === 'destination' ? `${value.name}, ${value.country}` : value.label}
                      </span>
                      <span className="block text-xs text-stone">
                        {kind === 'destination'
                          ? `${value.region} · ${value.tagline || value.tags?.slice(0, 3).join(' · ')}`
                          : `${t('Place')} · ${value.country || t(value.type) || t('Worldwide')}`}
                      </span>
                    </span>
                  </button>
                ))}
                {placeSearchLoading && (
                  <p role="status" className="px-3 py-2 text-sm text-stone">{t('Searching locations around the world...')}</p>
                )}
              </div>
            )}
            {destinationOpen && destinationQuery.trim().length >= 2 && locationSuggestions.length === 0 && !placeSearchLoading && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm text-stone shadow-soft">
                {t('No location results found. Try a nearby city, landmark, or address.')}
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-stone">
            {t('Choose a featured destination or search for any city, landmark or address.')}
          </p>
          {selected && (
            <div className="mt-3 flex gap-4 rounded-xl bg-cream/60 p-3">
              <img
                src={getDestinationImage(selected)}
                alt={`${selected.name}, ${selected.country}`}
                onError={(event) => {
                  event.currentTarget.onerror = null
                  event.currentTarget.src = getDestinationFallback(selected)
                }}
                className="h-16 w-24 shrink-0 rounded-lg object-cover"
              />
              <div className="text-sm">
                <p className="font-semibold">{selected.tagline}</p>
                <p className="mt-0.5 text-soot">{selected.recommendation?.reasons?.join(' · ') || selected.tags.slice(0, 4).join(' · ')}</p>
              </div>
            </div>
          )}
          {destinationPlace && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-cream/60 p-3 text-sm">
              <MapPin aria-hidden="true" size={18} className="shrink-0 text-clay-600" />
              <div>
                <p className="font-semibold">{destinationPlace.label}</p>
                <p className="mt-0.5 text-xs text-stone">{t('Custom location')} · {destinationPlace.country || t('Worldwide')}</p>
              </div>
            </div>
          )}
        </section>

        {/* dates + people */}
        <section className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="startDate">{t('From')}</label>
            <input id="startDate" type="date" className="input" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="endDate">{t('To')}</label>
            <input id="endDate" type="date" className="input" min={form.startDate} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="originCity">{t('Where you fly from')}</label>
            <input id="originCity" className="input" maxLength={100} value={form.originCity} onChange={(e) => set({ originCity: e.target.value })} placeholder={t('Home city')} required />
            <p className="mt-1 text-xs text-stone">{t('Defaults to your profile Home city. Change it if this trip starts elsewhere.')}</p>
          </div>
          <div>
            <label className="label" htmlFor="travelers">{t('Travellers')}</label>
            <input id="travelers" type="number" min={1} max={20} className="input" value={form.travelers} onChange={(e) => set({ travelers: e.target.value })} />
          </div>
          <p className="text-xs text-stone sm:col-span-4">
            {days > 0 ? t(days > 1 ? '{count} days' : '{count} day', { count: days }) : t('Pick valid dates')}
            {roughCost != null && days > 0 && (
              <> · {t('rough cost around')} <span className="font-semibold text-ink">{money(roughCost, estimateCurrency, locale)}</span> {t('for everyone, before flights')}</>
            )}
          </p>
        </section>

        {/* style */}
        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label">{t('Budget style')}</p>
            <div className="space-y-2">
              {Object.entries(BUDGET_LABEL).map(([key, label]) => (
                <OptionRow key={key} on={form.budgetLevel === key} onClick={() => set({ budgetLevel: key })} label={t(label)}
                  hint={dailyCostEstimate != null ? `~${money(convertCurrency(selected?.dailyCost?.[key] ?? CUSTOM_DESTINATION_DAILY_COST[key], estimateCurrency), estimateCurrency, locale)} ${t('per person per day')}` : undefined} />
              ))}
            </div>
          </div>
          <div>
            <p className="label">{t('Pace')}</p>
            <div className="space-y-2">
              {Object.entries(PACE_LABEL).map(([key, label]) => (
                <OptionRow key={key} on={form.pace === key} onClick={() => set({ pace: key })} label={t(label)} hint={t(PACE_HELP[key])} />
              ))}
            </div>
          </div>
        </section>

        {/* travel style */}
        <section>
          <label className="label" htmlFor="travelStyle">{t('Travel style')}</label>
          <select
            id="travelStyle"
            className="input"
            value={form.travelStyle}
            onChange={(e) => {
              const travelStyle = e.target.value
              set({
                travelStyle,
                interests: travelStyle ? TRAVEL_STYLES[travelStyle].interests : form.interests,
              })
            }}
          >
            <option value="">{t('Choose a travel style…')}</option>
            {Object.entries(TRAVEL_STYLES).map(([key, style]) => (
              <option key={key} value={key}>{t(style.label)}</option>
            ))}
          </select>
        </section>

        {/* interests */}
        <section>
          <p className="label">{t('What matters on this trip')}</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button type="button" key={i} onClick={() => toggleInterest(i)} className={form.interests.includes(i) ? 'chip-on' : 'chip-idle'}>
                {t(i)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone">{t('Prefilled from your profile. Change it just for this trip if you like.')}</p>
        </section>

        {/* extras */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">{t('Trip name')} <span className="font-normal text-stone">{t('(optional)')}</span></label>
            <input id="title" className="input" maxLength={80} placeholder={selected ? t('e.g. {destination} with Sam', { destination: selected.name }) : t('e.g. Autumn escape')} value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="notes">{t('Notes')} <span className="font-normal text-stone">{t('(optional)')}</span></label>
            <input id="notes" className="input" maxLength={2000} placeholder={t('Anniversary, need to be back by the 30th, etc.')} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-white/60 p-4 text-sm">
          <input type="checkbox" className="mt-0.5 accent-clay-500" checked={form.autoGenerate} onChange={(e) => set({ autoGenerate: e.target.checked })} />
          <span>
            <span className="font-medium">{t('Draft the itinerary and budget now')}</span>
            <span className="block text-soot">{t("Untick if you'd rather build the days yourself from scratch.")}</span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-sand/70 pt-6">
          {stage && <span className="text-sm text-stone animate-pulse">{t(stage)}</span>}
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">{t('Cancel')}</button>
          <button type="submit" disabled={busy} className="btn-primary !px-6">
            {busy ? t('Working…') : t('Create trip')}
          </button>
        </div>
      </form>
    </div>
  )
}

function OptionRow({ on, onClick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition',
        on ? 'border-ink bg-ink text-paper' : 'border-sand bg-white/60 hover:border-ink/40'
      )}
    >
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className={clsx('block text-xs', on ? 'text-paper/70' : 'text-stone')}>{hint}</span>}
      </span>
      {on && <Check size={16} />}
    </button>
  )
}
