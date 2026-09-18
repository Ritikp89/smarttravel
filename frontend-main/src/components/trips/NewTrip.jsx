import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi, tripApi, itineraryApi, budgetApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { BUDGET_LABEL, ErrorBox, INTERESTS, PACE_LABEL, PageHeader, money, Spinner } from '../ui'

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
    notes: '',
    autoGenerate: true,
  }))

  useEffect(() => {
    destinationApi
      .list({ sort: 'name' })
      .then((d) => setDestinations(d.destinations))
      .catch(setError)
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const selected = useMemo(() => destinations?.find((d) => d._id === form.destination), [destinations, form.destination])

  const days = Math.max(0, differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1)
  const roughCost = selected ? selected.dailyCost[form.budgetLevel] * days * form.travelers : null

  const toggleInterest = (i) =>
    set({ interests: form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i] })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.destination) return setError('Pick a destination first')
    if (days < 1) return setError('The end date needs to be on or after the start date')
    if (days > 30) return setError('We cap trips at 30 days - split a longer one into two')

    setBusy(true)
    setError(null)
    try {
      setStage('Saving your trip…')
      const trip = await tripApi.create({
        destination: form.destination,
        title: form.title.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        travelers: Number(form.travelers),
        budgetLevel: form.budgetLevel,
        pace: form.pace,
        interests: form.interests,
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
          <label className="label">Where to</label>
          <select className="input" value={form.destination} onChange={(e) => set({ destination: e.target.value })} required>
            <option value="">Choose a destination…</option>
            {destinations?.map((d) => (
              <option key={d._id} value={d._id}>{d.name}, {d.country}</option>
            ))}
          </select>
          {selected && (
            <div className="mt-3 flex gap-4 rounded-xl bg-cream/60 p-3">
              {selected.image && <img src={selected.image} alt="" className="h-16 w-24 rounded-lg object-cover" />}
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
