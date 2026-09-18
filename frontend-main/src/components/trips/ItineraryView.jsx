import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp, Clock, Footprints, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { itineraryApi } from '../../services/api'
import { CATEGORY_EMOJI, Empty, ErrorBox, money } from '../ui'

export default function ItineraryView({ trip, itinerary, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(null) // dayNumber currently picking a leftover for

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
        We'll pack {trip.days} day{trip.days > 1 ? 's' : ''} in {trip.destination.name} around your interests and pace.
        <div className="mt-5">
          <button onClick={generate} disabled={busy} className="btn-primary">
            <Sparkles size={16} /> {busy ? 'Packing your days…' : 'Generate itinerary'}
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
          {totalActivities} activities over {itinerary.days.length} days · about {money(totalCost)} per person in tickets
          {itinerary.customised && <span className="ml-2 rounded-full bg-butter/50 px-2 py-0.5 text-xs text-ink">edited by you</span>}
        </p>
        <button onClick={generate} disabled={busy} className="btn-secondary !py-1.5 text-xs" title="Throw this away and build a fresh plan">
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Regenerate
        </button>
      </div>

      <ErrorBox error={error} className="mb-4" />

      <div className={clsx('space-y-6', busy && 'pointer-events-none opacity-60')}>
        {itinerary.days.map((day) => (
          <section key={day._id} className="card overflow-hidden">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sand/60 bg-cream/40 px-5 py-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-semibold">Day {day.dayNumber}</span>
                <span className="text-sm text-soot">{format(new Date(day.date), 'EEEE d MMM')}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone">
                <span className="italic">{day.theme}</span>
                {day.slots.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {day.totalHours}h</span>
                    <span>·</span>
                    <span>{day.estimatedCost === 0 ? 'free' : money(day.estimatedCost)} pp</span>
                  </>
                )}
              </div>
            </header>

            <ol className="divide-y divide-sand/50">
              {day.slots.length === 0 && (
                <li className="px-5 py-6 text-sm text-stone">
                  Nothing planned. A free day is a fine thing - or add something below.
                </li>
              )}
              {day.slots.map((slot, idx) => {
                const a = slot.activity
                if (!a) return null
                return (
                  <li key={slot._id} className="group relative flex gap-4 px-5 py-4">
                    {slot.travelMinutesFromPrevious > 0 && (
                      <span className="absolute -top-2.5 left-[4.5rem] flex items-center gap-1 rounded-full border border-sand bg-paper px-2 text-[10px] text-stone">
                        <Footprints size={10} /> {slot.travelMinutesFromPrevious} min
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
                        {a.durationHours}h · {a.cost === 0 ? 'free' : money(a.cost)}
                        {a.neighborhood && <> · {a.neighborhood}</>}
                        {a.bookingRequired && <span className="text-clay-500"> · book ahead</span>}
                      </p>
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
                <LeftoverPicker leftovers={itinerary.leftovers} onPick={(a) => addLeftover(day, a)} onClose={() => setAdding(null)} />
              ) : (
                <button
                  onClick={() => setAdding(day.dayNumber)}
                  disabled={!itinerary.leftovers?.length}
                  className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                >
                  <Plus size={13} /> {itinerary.leftovers?.length ? 'Add something to this day' : 'Everything is already scheduled'}
                </button>
              )}
            </footer>
          </section>
        ))}
      </div>

      {itinerary.leftovers?.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-2">Didn't make the cut</p>
          <p className="mb-3 text-sm text-soot">
            {itinerary.leftovers.length} more thing{itinerary.leftovers.length > 1 ? 's' : ''} at this destination. Swap any in using "add something" on a day.
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
    </div>
  )
}

function IconBtn({ children, onClick, disabled, label, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        'grid h-6 w-6 place-items-center rounded-md transition disabled:opacity-30',
        danger ? 'text-clay-500 hover:bg-clay-50' : 'text-soot hover:bg-cream hover:text-ink'
      )}
    >
      {children}
    </button>
  )
}

function LeftoverPicker({ leftovers, onPick, onClose }) {
  return (
    <div className="animate-rise">
      <div className="mb-2 flex items-center justify-between text-xs text-soot">
        <span>Pick one to add - we'll slot it in at the end of the day and fix the times.</span>
        <button onClick={onClose} className="btn-ghost !p-1"><X size={13} /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {leftovers.map((a) => (
          <button key={a._id} onClick={() => onPick(a)} className="chip-idle">
            {CATEGORY_EMOJI[a.category]} {a.name} <span className="text-stone">· {a.durationHours}h</span>
          </button>
        ))}
      </div>
    </div>
  )
}
