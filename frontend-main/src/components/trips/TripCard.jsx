import { Link } from 'react-router-dom'
import { differenceInCalendarDays, format } from 'date-fns'
import { CalendarDays, Users } from 'lucide-react'
import clsx from 'clsx'
import { money } from '../ui'

const STATUS = {
  planning: 'bg-sky-100 text-sky-500',
  booked: 'bg-moss-100 text-moss-700',
  completed: 'bg-cream text-soot',
  cancelled: 'bg-clay-50 text-clay-600',
}

export function tripCountdown(trip) {
  const start = new Date(trip.startDate)
  const end = new Date(trip.endDate)
  const now = new Date()
  const toStart = differenceInCalendarDays(start, now)
  if (toStart > 1) return `in ${toStart} days`
  if (toStart === 1) return 'tomorrow'
  if (toStart === 0) return 'today!'
  if (differenceInCalendarDays(end, now) >= 0) return 'happening now'
  return 'done'
}

export default function TripCard({ trip, compact = false }) {
  const d = trip.destination
  const range = `${format(new Date(trip.startDate), 'd MMM')} – ${format(new Date(trip.endDate), 'd MMM yyyy')}`

  return (
    <Link to={`/trips/${trip._id}`} className={clsx('card group flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift', compact ? 'flex-row' : 'flex-col')}>
      <div className={clsx('relative shrink-0 overflow-hidden bg-sand', compact ? 'w-28 sm:w-40' : 'aspect-[16/9]')}>
        {(trip.coverImage || d?.image) && (
          <img src={trip.coverImage || d.image} alt={d?.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        {!compact && (
          <span className={clsx('absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold capitalize', STATUS[trip.status])}>
            {trip.status}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone">{d?.name}, {d?.country}</p>
            <h3 className="font-display text-xl font-semibold leading-tight">{trip.title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 text-xs text-soot">{tripCountdown(trip)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soot">
          <span className="flex items-center gap-1"><CalendarDays size={12} /> {range}</span>
          <span className="flex items-center gap-1"><Users size={12} /> {trip.travelers}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 text-xs">
          <span className={trip.hasItinerary ? 'text-moss-600' : 'text-stone'}>
            {trip.hasItinerary ? `${trip.activityCount} activities planned` : 'No itinerary yet'}
          </span>
          {trip.budgetTotal != null && <span className="font-semibold text-ink">{money(trip.budgetTotal, trip.currency)}</span>}
        </div>
      </div>
    </Link>
  )
}
