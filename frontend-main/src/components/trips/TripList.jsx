import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { tripApi } from '../../services/api'
import TripCard from './TripCard'
import { Empty, ErrorBox, PageHeader, Spinner } from '../ui'

export default function TripList() {
  const [trips, setTrips] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('upcoming')

  const load = () => {
    setError(null)
    tripApi.list().then(setTrips).catch(setError)
  }
  useEffect(load, [])

  const grouped = useMemo(() => {
    if (!trips) return { upcoming: [], past: [] }
    const today = new Date().setHours(0, 0, 0, 0)
    return {
      upcoming: trips.filter((t) => new Date(t.endDate) >= today && t.status !== 'cancelled'),
      past: trips.filter((t) => new Date(t.endDate) < today || t.status === 'cancelled').reverse(),
    }
  }, [trips])

  const shown = grouped[tab]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="My trips"
        title="Everywhere you're going"
        aside={
          <Link to="/trips/new" className="btn-primary"><Plus size={16} /> Plan a trip</Link>
        }
      />

      <div className="mb-6 flex gap-1 border-b border-sand/70">
        {[
          ['upcoming', `Upcoming (${grouped.upcoming.length})`],
          ['past', `Past (${grouped.past.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${tab === key ? 'border-ink font-medium text-ink' : 'border-transparent text-stone hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBox error={error} onRetry={load} />
      ) : !trips ? (
        <Spinner label="Loading your trips…" />
      ) : shown.length === 0 ? (
        <Empty
          title={tab === 'upcoming' ? 'Nothing on the calendar' : 'No past trips yet'}
          illustration={tab === 'upcoming' ? '🧳' : '📷'}
          action={tab === 'upcoming' && <Link to="/trips/new" className="btn-primary">Plan your first trip</Link>}
        >
          {tab === 'upcoming' ? 'Pick a destination and some dates and we\'ll do the rest.' : 'Once a trip\'s end date passes it shows up here.'}
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TripCard key={t._id} trip={t} />
          ))}
        </div>
      )}
    </div>
  )
}
