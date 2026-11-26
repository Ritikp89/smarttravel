import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Clock, ExternalLink, Footprints, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi, itineraryApi } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'
import { CATEGORY_EMOJI, Empty, ErrorBox, formatDate, money } from '../ui'
import { convertCurrency } from '../../services/currency'

export default function ItineraryView({ trip, itinerary, currency = 'INR', onChange }) {
  const { t, locale } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(null) // dayNumber currently picking a leftover for
  const [destinationActivities, setDestinationActivities] = useState([])

  useEffect(() => {
    if (!trip?.destination?._id) {
      setDestinationActivities([])
      return
    }

    destinationApi.activities(trip.destination._id)
      .then((data) => setDestinationActivities(data.activities || []))
      .catch(() => setDestinationActivities([]))
  }, [trip?.destination?._id])

  const suggestions = useMemo(() => {
    if (!itinerary) return []
    const scheduled = new Set(
      itinerary.days.flatMap((day) => day.slots.map((slot) => slot.activity?._id).filter(Boolean))
    )
    const leftovers = itinerary.leftovers || []
    const leftoversById = new Map(leftovers.map((activity) => [activity._id, activity]))

    return [
      ...leftovers,
      ...destinationActivities.filter((activity) => (
        (trip.pace === 'packed' || !scheduled.has(activity._id)) && !leftoversById.has(activity._id)
      )),
    ]
  }, [destinationActivities, itinerary])

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      const next = await fn()
      onChange(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const generate = () => run(() => itineraryApi.generate(trip._id))

  const saveDay = (day, slots) =>
    run(() => itineraryApi.updateDay(trip._id, day.dayNumber, { slots: slots.map((s) => ({ activity: s.activity._id, note: s.note })) }))

  const removeSlot = (day, idx) => saveDay(day, day.slots.filter((_, i) => i !== idx))

  const move = (day, idx, dir) => {
    const slots = [...day.slots]
    const j = idx + dir
    if (j < 0 || j >= slots.length) return
    ;[slots[idx], slots[j]] = [slots[j], slots[idx]]
    saveDay(day, slots)
  }

  const addLeftover = (day, activity) => {
    setAdding(null)
    saveDay(day, [...day.slots, { activity }])
  }

  if (!itinerary) {
    return (
      <Empty title="No itinerary yet" illustration="🗓">
        {trip.destination?.name
          ? t("We'll pack {days} days in {destination} around your interests and pace.", { days: trip.days, destination: trip.destination.name })
          : t('The saved destination is no longer available. You can still view trip details and budget.')}
        <div className="mt-5">
          <button onClick={generate} disabled={busy || !trip.destination?._id} className="btn-primary">
            <Sparkles size={16} /> {busy ? t('Packing your days…') : trip.destination?._id ? t('Generate itinerary') : t('Destination unavailable')}
          </button>
        </div>
        <ErrorBox error={error} className="mt-4 text-left" />
      </Empty>
    )
  }

  const totalCost = itinerary.days.reduce((s, d) => s + d.estimatedCost, 0)
  const totalActivities = itinerary.days.reduce((s, d) => s + d.slots.length, 0)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-soot">
          {t('{count} activities over {days} days · about {amount} per person in tickets', {
            count: totalActivities,
            days: itinerary.days.length,
            amount: money(convertCurrency(totalCost, currency), currency, locale),
          })}
          {itinerary.customised && <span className="ml-2 rounded-full bg-butter/50 px-2 py-0.5 text-xs text-ink">{t('edited by you')}</span>}
        </p>
        <button onClick={generate} disabled={busy || !trip.destination?._id} className="btn-secondary !py-1.5 text-xs" title={t(trip.destination?._id ? 'Throw this away and build a fresh plan' : 'Destination unavailable')}>
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> {t('Regenerate')}
        </button>
      </div>

      <ErrorBox error={error} className="mb-4" />

      <div className={clsx('space-y-6', busy && 'pointer-events-none opacity-60')}>
        {itinerary.days.map((day) => (
          <section key={day._id} className="card overflow-hidden">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sand/60 bg-cream/40 px-5 py-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-semibold">{t('Day {day}', { day: day.dayNumber })}</span>
                <span className="text-sm text-soot">{formatDate(day.date, 'EEEE d MMM', locale)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone">
                <span className="italic">{t(day.theme)}</span>
                {day.slots.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {day.totalHours}h</span>
                    <span>·</span>
                    <span>{day.estimatedCost === 0 ? t('free') : money(convertCurrency(day.estimatedCost, currency), currency, locale)} {t('pp')}</span>
                  </>
                )}
              </div>
            </header>

            <ol className="divide-y divide-sand/50">
              {day.slots.length === 0 && (
                <li className="px-5 py-6 text-sm text-stone">
                  {t('Nothing planned. A free day is a fine thing - or add something below.')}
                </li>
              )}
              {day.slots.map((slot, idx) => {
                const a = slot.activity
                if (!a) {
                  return (
                    <li key={slot._id} className="flex gap-4 px-5 py-4 text-sm text-stone">
                      <span className="w-14 shrink-0 text-right tabular-nums">{slot.startTime}</span>
                      <span>{t('Activity details are no longer available.')}</span>
                    </li>
                  )
                }
                return (
                  <li key={slot._id} className="group relative flex gap-4 px-5 py-4">
                    {slot.travelMinutesFromPrevious > 0 && (
                      <span className="absolute -top-2.5 left-[4.5rem] flex items-center gap-1 rounded-full border border-sand bg-paper px-2 text-[10px] text-stone">
                        <Footprints size={10} />                         {t('{count} min', { count: slot.travelMinutesFromPrevious })}
                      </span>
                    )}
                    <div className="w-14 shrink-0 pt-0.5 text-right">
                      <p className="text-sm font-semibold tabular-nums">{slot.startTime}</p>
                      <p className="text-[11px] tabular-nums text-stone">{slot.endTime}</p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream text-base">{CATEGORY_EMOJI[a.category]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{a.name}</p>
                      {a.description && <p className="mt-0.5 line-clamp-2 text-sm text-soot">{a.description}</p>}
                      <p className="mt-1 text-xs text-stone">
                        {a.durationHours}h · {a.cost === 0 ? t('free') : money(convertCurrency(a.cost, currency), currency, locale)}
                        {a.neighborhood && <> · {a.neighborhood}</>}
                        {a.bookingRequired && <span className="text-clay-500"> · book ahead</span>}
                      </p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          a.coordinates?.lat != null && a.coordinates?.lng != null
                            ? `${a.coordinates.lat},${a.coordinates.lng}`
                            : `${a.name}, ${trip.destination?.name || ''}, ${trip.destination?.country || ''}`
                        )}&travelmode=walking`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-clay-600 hover:underline"
                      >
                        {t('Directions')} <ExternalLink size={11} />
                      </a>
                      <a
                        href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(`${a.name} ${trip.destination?.name || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 ml-3 inline-flex items-center gap-1 text-xs font-semibold text-clay-600 hover:underline"
                      >
                        {t('Book tour')} <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <IconBtn onClick={() => move(day, idx, -1)} disabled={idx === 0} label="Move up"><ArrowUp size={13} /></IconBtn>
                      <IconBtn onClick={() => move(day, idx, 1)} disabled={idx === day.slots.length - 1} label="Move down"><ArrowDown size={13} /></IconBtn>
                      <IconBtn onClick={() => removeSlot(day, idx)} label="Remove" danger><Trash2 size={13} /></IconBtn>
                    </div>
                  </li>
                )
              })}
            </ol>

            <footer className="border-t border-sand/50 px-5 py-2.5">
              {adding === day.dayNumber ? (
                <SuggestionPicker
                  suggestions={suggestions.filter((activity) => (
                    !day.slots.some((slot) => (slot.activity?._id || slot.activity) === activity._id)
                  ))}
                  onPick={(a) => addLeftover(day, a)}
                  onClose={() => setAdding(null)}
                />
              ) : (
                <button
                  onClick={() => setAdding(day.dayNumber)}
                  disabled={!suggestions.length}
                  className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                >
                  <Plus size={13} /> {suggestions.length ? 'Suggested activities to add' : 'Everything is already scheduled'}
                </button>
              )}
            </footer>
          </section>
        ))}
      </div>

      {itinerary.leftovers?.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-2">{t("Didn't make the cut")}</p>
          <p className="mb-3 text-sm text-soot">
            {t(itinerary.leftovers.length > 1 ? '{count} more things at this destination. Swap any in using "add something" on a day.' : '{count} more thing at this destination. Swap any in using "add something" on a day.', { count: itinerary.leftovers.length })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {itinerary.leftovers.map((a) => (
              <li key={a._id} className="rounded-full border border-sand bg-white/60 px-3 py-1 text-xs text-soot">
                {CATEGORY_EMOJI[a.category]} {a.name} <span className="text-stone">· {a.durationHours}h</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-2">{t('More suggestions')}</p>
          <p className="mb-3 text-sm text-soot">
            {t('Add another stop to any day, or use these ideas to customize a packed schedule.')}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.slice(0, 12).map((activity) => (
              <li key={activity._id} className="rounded-xl border border-sand bg-white/60 p-3">
                <p className="text-sm font-medium">
                  {CATEGORY_EMOJI[activity.category]} {activity.name}
                </p>
                {activity.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-soot">{activity.description}</p>
                )}
                <p className="mt-1 text-[11px] text-stone">
                  {activity.durationHours}h · {activity.cost === 0 ? t('free') : money(convertCurrency(activity.cost, currency), currency, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, disabled, label, danger }) {
  const { t } = useLanguage()
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={t(label)}
      title={t(label)}
      className={clsx(
        'grid h-6 w-6 place-items-center rounded-md transition disabled:opacity-30',
        danger ? 'text-clay-500 hover:bg-clay-50' : 'text-soot hover:bg-cream hover:text-ink'
      )}
    >
      {children}
    </button>
  )
}

function SuggestionPicker({ suggestions, onPick, onClose }) {
  const { t, locale } = useLanguage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const categories = [...new Set(suggestions.map((activity) => activity.category))].sort()
  const filtered = suggestions.filter((activity) => {
    const matchesQuery = `${activity.name} ${activity.description || ''} ${activity.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
    return matchesQuery && (!category || activity.category === category)
  })

  return (
    <div className="animate-rise py-2">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t('Choose an activity for this day')}</p>
          <p className="mt-0.5 text-xs text-soot">{t("We'll place your pick at the end and adjust the times.")}</p>
        </div>
        <button onClick={onClose} className="btn-ghost !p-1" aria-label={t('Close suggestions')}><X size={13} /></button>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className="input !py-2"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Search activities…')}
          aria-label={t('Search suggested activities')}
        />
        {categories.length > 1 && (
          <select
            className="input sm:w-44"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t('Filter activity category')}
          >
            <option value="">{t('All types')}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_EMOJI[item]} {t(item)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-sand px-3 py-4 text-sm text-stone sm:col-span-2">
            {t('No suggestions match this search.')}
          </div>
        )}
        {filtered.map((activity) => (
          <button
            key={activity._id}
            type="button"
            onClick={() => onPick(activity)}
            className="flex items-start gap-3 rounded-xl border border-sand bg-white/70 p-3 text-left transition hover:border-ink/40 hover:bg-cream/70"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream text-base">
              {CATEGORY_EMOJI[activity.category]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium leading-snug">{activity.name}</span>
              {activity.description && (
                <span className="mt-0.5 block line-clamp-2 text-xs text-soot">{activity.description}</span>
              )}
              <span className="mt-1 block text-[11px] text-stone">
                {activity.durationHours}h · {activity.cost === 0 ? t('free') : money(convertCurrency(activity.cost, currency), currency, locale)}
                {activity.neighborhood && <> · {activity.neighborhood}</>}
              </span>
            </span>
            <Plus size={14} className="mt-1 shrink-0 text-clay-500" />
          </button>
        ))}
      </div>
    </div>
  )
}
