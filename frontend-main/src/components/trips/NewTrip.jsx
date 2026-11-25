import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi, tripApi, itineraryApi, budgetApi, externalApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { BUDGET_LABEL, ErrorBox, INTERESTS, PACE_LABEL, TRAVEL_STYLES, PageHeader, money, Spinner } from '../ui'
import { getDestinationFallback, getDestinationImage } from '../../services/travelImages'

const PACE_HELP = {
  relaxed: 'One or two things a day. Long lunches.',
  balanced: 'A proper morning and afternoon, evenings free-ish.',
  packed: 'Up early, back late, see everything.',
}

export default function NewTrip() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [destinations, setDestinations] = useState(null)
  const [destinationQuery, setDestinationQuery] = useState('')
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [destinationHighlighted, setDestinationHighlighted] = useState(0)
  const [placeSuggestions, setPlaceSuggestions] = useState([])
  const [destinationPlace, setDestinationPlace] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('') // what we're doing during submit

  const [form, setForm] = useState(() => ({
    destination: params.get('destination') || '',
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
      return
    }

    const timer = window.setTimeout(() => {
      externalApi.geocode(query).then(setPlaceSuggestions).catch(() => setPlaceSuggestions([]))
    }, 350)

    return () => window.clearTimeout(timer)
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

  const days = Math.max(0, differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1)
  const roughCost = selected ? selected.dailyCost[form.budgetLevel] * days * form.travelers : null

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
      setDestinationHighlighted((current) => Math.min(current + 1, destinationSuggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setDestinationHighlighted((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && destinationOpen && destinationSuggestions[destinationHighlighted]) {
      event.preventDefault()
      chooseDestination(destinationSuggestions[destinationHighlighted])
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
          <label className="label" htmlFor="destination">Where to</label>
          <div className="relative">
            <input
              id="destination"
              className="input"
              value={destinationQuery}
              placeholder="Type a city or country…"
              autoComplete="off"
              role="combobox"
              aria-expanded={destinationOpen}
              aria-controls="destination-suggestions"
              aria-autocomplete="list"
              onFocus={() => setDestinationOpen(true)}
              onChange={(e) => {
                setDestinationQuery(e.target.value)
                set({ destination: '' })
                setDestinationPlace(null)
                setDestinationHighlighted(0)
                setDestinationOpen(true)
              }}
              onKeyDown={handleDestinationKeyDown}
              onBlur={() => window.setTimeout(() => setDestinationOpen(false), 100)}
            />
            {destinationOpen && (destinationSuggestions.length > 0 || placeSuggestions.length > 0) && (
              <div
                id="destination-suggestions"
                role="listbox"
                className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-sand bg-white p-1 shadow-soft"
              >
                {destinationSuggestions.map((d, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={destinationHighlighted === index}
                    key={d._id}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setDestinationHighlighted(index)}
                    onClick={() => chooseDestination(d)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left',
                      destinationHighlighted === index ? 'bg-cream' : 'hover:bg-cream/70'
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{d.name}, {d.country}</span>
                      <span className="block text-xs text-stone">{d.region} · {d.tagline || d.tags?.slice(0, 3).join(' · ')}</span>
                    </span>
                  </button>
                ))}
                {placeSuggestions.map((place) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    key={`${place.lat}-${place.lng}-${place.label}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choosePlace(place)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-cream/70"
                  >
                    <span>
                      <span className="block text-sm font-medium">{place.label}</span>
                      <span className="block text-xs text-stone">Place · {place.country || place.type || 'Worldwide'}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {destinationOpen && destinationQuery.trim().length >= 2 && destinationSuggestions.length === 0 && placeSuggestions.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm text-stone shadow-soft">
                No matching place yet - keep typing or press Create trip to use "{destinationQuery.trim()}"
              </div>
            )}
          </div>
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
        </section>

        {/* dates + people */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="startDate">From</label>
            <input id="startDate" type="date" className="input" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="endDate">To</label>
            <input id="endDate" type="date" className="input" min={form.startDate} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="travelers">Travellers</label>
            <input id="travelers" type="number" min={1} max={20} className="input" value={form.travelers} onChange={(e) => set({ travelers: e.target.value })} />
          </div>
          <p className="text-xs text-stone sm:col-span-3">
            {days > 0 ? `${days} day${days > 1 ? 's' : ''}` : 'Pick valid dates'}
            {roughCost != null && days > 0 && (
              <> · rough cost around <span className="font-semibold text-ink">{money(roughCost)}</span> for everyone, before flights</>
            )}
          </p>
        </section>

        {/* style */}
        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label">Budget style</p>
            <div className="space-y-2">
              {Object.entries(BUDGET_LABEL).map(([key, label]) => (
                <OptionRow key={key} on={form.budgetLevel === key} onClick={() => set({ budgetLevel: key })} label={label}
                  hint={selected ? `~${money(selected.dailyCost[key])} per person per day` : undefined} />
              ))}
            </div>
          </div>
          <div>
            <p className="label">Pace</p>
            <div className="space-y-2">
              {Object.entries(PACE_LABEL).map(([key, label]) => (
                <OptionRow key={key} on={form.pace === key} onClick={() => set({ pace: key })} label={label} hint={PACE_HELP[key]} />
              ))}
            </div>
          </div>
        </section>

        {/* travel style */}
        <section>
          <label className="label" htmlFor="travelStyle">Travel style</label>
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
            <option value="">Choose a travel style…</option>
            {Object.entries(TRAVEL_STYLES).map(([key, style]) => (
              <option key={key} value={key}>{style.label}</option>
            ))}
          </select>
        </section>

        {/* interests */}
        <section>
          <p className="label">What matters on this trip</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button type="button" key={i} onClick={() => toggleInterest(i)} className={form.interests.includes(i) ? 'chip-on' : 'chip-idle'}>
                {i}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone">Prefilled from your profile. Change it just for this trip if you like.</p>
        </section>

        {/* extras */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">Trip name <span className="font-normal text-stone">(optional)</span></label>
            <input id="title" className="input" maxLength={80} placeholder={selected ? `e.g. ${selected.name} with Sam` : 'e.g. Autumn escape'} value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes <span className="font-normal text-stone">(optional)</span></label>
            <input id="notes" className="input" maxLength={2000} placeholder="Anniversary, need to be back by the 30th, etc." value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-white/60 p-4 text-sm">
          <input type="checkbox" className="mt-0.5 accent-clay-500" checked={form.autoGenerate} onChange={(e) => set({ autoGenerate: e.target.checked })} />
          <span>
            <span className="font-medium">Draft the itinerary and budget now</span>
            <span className="block text-soot">Untick if you'd rather build the days yourself from scratch.</span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-sand/70 pt-6">
          {stage && <span className="text-sm text-stone animate-pulse">{stage}</span>}
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary !px-6">
            {busy ? 'Working…' : 'Create trip'}
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
