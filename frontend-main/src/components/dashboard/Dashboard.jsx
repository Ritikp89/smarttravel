import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, format } from 'date-fns'
import { ArrowRight, Plus } from 'lucide-react'
import { destinationApi, tripApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import TripCard from '../trips/TripCard'
import DestinationCard from '../explore/DestinationCard'
import { Empty, ErrorBox, Spinner, money } from '../ui'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [trips, setTrips] = useState(null)
  const [picks, setPicks] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    tripApi.list().then(setTrips).catch(setError)
    destinationApi.recommended({ limit: 3 }).then((d) => setPicks(d.destinations)).catch(() => {})
  }, [])

  const today = new Date().setHours(0, 0, 0, 0)
  const upcoming = trips?.filter((t) => new Date(t.endDate) >= today && t.status !== 'cancelled') || []
  const next = upcoming[0]
  const past = trips?.filter((t) => new Date(t.endDate) < today) || []
  const totalBudget = upcoming.reduce((s, t) => s + (t.budgetTotal || 0), 0)
  const prefs = user.preferences || {}

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">{format(new Date(), 'EEEE, d MMMM')}</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">{greeting()}, {user.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-soot">
            {next
              ? nextTripLine(next)
              : "Nothing booked. That's either very relaxing or a problem we can fix."}
          </p>
        </div>
        <Link to="/trips/new" className="btn-primary"><Plus size={16} /> Plan a trip</Link>
      </div>

      <ErrorBox error={error} className="mb-6" />

      {!trips ? (
        <Spinner label="Pulling up your trips…" />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            {/* next up */}
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-2xl font-semibold">Next up</h2>
                {upcoming.length > 1 && <Link to="/trips" className="text-sm text-soot hover:underline">All {upcoming.length} upcoming</Link>}
              </div>
              {next ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <TripCard trip={next} />
                  <div className="flex flex-col gap-4">
                    <Checklist trip={next} />
                    {upcoming[1] && <TripCard trip={upcoming[1]} compact />}
                  </div>
                </div>
              ) : (
                <Empty title="No upcoming trips" illustration="🧭" action={<Link to="/trips/new" className="btn-primary">Plan one</Link>}>
                  Pick somewhere from the suggestions on the right, or browse everything.
                </Empty>
              )}
            </section>

            {/* picks */}
            {picks.length > 0 && (
              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Picked for you</h2>
                    <p className="text-sm text-soot">
                      {prefs.interests?.length
                        ? `Because you like ${prefs.interests.slice(0, 3).join(', ')} and it's a good month to go.`
                        : 'Add some interests to your profile and these get a lot smarter.'}
                    </p>
                  </div>
                  <Link to="/explore" className="hidden items-center gap-1 text-sm text-soot hover:underline sm:flex">
                    Explore <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {picks.map((d) => <DestinationCard key={d._id} destination={d} />)}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <div className="card p-5">
              <p className="eyebrow mb-3">At a glance</p>
              <dl className="space-y-3 text-sm">
                <Row label="Upcoming trips" value={upcoming.length} />
                <Row label="Trips taken" value={past.length} />
                <Row label="Committed budget" value={money(totalBudget, prefs.currency)} />
                <Row label="Saved places" value={user.savedDestinations?.length || 0} />
              </dl>
            </div>

            <div className="card p-5">
              <p className="eyebrow mb-3">How you travel</p>
              {prefs.interests?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {prefs.interests.map((i) => <span key={i} className="chip-idle !cursor-default">{i}</span>)}
                </div>
              ) : (
                <p className="text-sm text-soot">No interests set yet.</p>
              )}
              <p className="mt-3 text-sm text-soot capitalize">{prefs.budgetLevel} budget · {prefs.travelPace} pace</p>
              <Link to="/profile" className="mt-3 inline-block text-sm text-ink underline underline-offset-4">Edit preferences</Link>
            </div>

            {user.savedDestinations?.length > 0 && (
              <div className="card p-5">
                <p className="eyebrow mb-3">Saved for later</p>
                <ul className="space-y-2">
                  {user.savedDestinations.slice(0, 5).map((d) => (
                    <li key={d._id || d}>
                      <Link to={`/explore/${d.slug}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-cream">
                        {d.image && <img src={d.image} alt="" className="h-10 w-14 rounded-md object-cover" />}
                        <span className="text-sm">
                          <span className="font-medium">{d.name}</span>
                          <span className="block text-xs text-stone">{d.country}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

function nextTripLine(trip) {
  const days = differenceInCalendarDays(new Date(trip.startDate), new Date())
  const name = trip.title || trip.destination?.name || 'Your trip'
  if (days > 1) return `${name} is ${days} days away.${days < 14 ? ' Time to think about packing.' : ''}`
  if (days === 1) return `${name} is tomorrow. Passport, charger, sunglasses.`
  if (days === 0) return `You leave for ${name} today. Go!`
  return `You're in ${name} right now - hope it's going well.`
}

function Checklist({ trip }) {
  const items = [
    { done: trip.hasItinerary, label: trip.hasItinerary ? `${trip.activityCount} activities planned` : 'Build an itinerary' },
    { done: trip.budgetTotal != null, label: trip.budgetTotal != null ? `Budget set at ${money(trip.budgetTotal, trip.currency)}` : 'Estimate the budget' },
    { done: trip.status === 'booked' || trip.status === 'completed', label: trip.status === 'booked' ? 'Marked as booked' : 'Mark as booked once flights are in' },
  ]
  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">Where you're at</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2.5 text-sm">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${it.done ? 'bg-moss-500 text-paper' : 'border border-sand text-transparent'}`}>✓</span>
            <span className={it.done ? 'text-soot line-through decoration-sand' : ''}>{it.label}</span>
          </li>
        ))}
      </ul>
      <Link to={`/trips/${trip._id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
        Open trip <ArrowRight size={14} />
      </Link>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-soot">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
