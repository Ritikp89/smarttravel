import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, CalendarDays, MapPin, Trash2, Users } from 'lucide-react'
import clsx from 'clsx'
import { tripApi } from '../../services/api'
import ItineraryView from './ItineraryView'
import BudgetPanel from './BudgetPanel'
import TripOverview from './TripOverview'
import { tripCountdown } from './TripCard'
import { BUDGET_LABEL, ErrorBox, PACE_LABEL, Spinner } from '../ui'

const TABS = [
  ['itinerary', 'Itinerary'],
  ['budget', 'Budget'],
  ['overview', 'Overview'],
]

const STATUSES = ['planning', 'booked', 'completed', 'cancelled']

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'itinerary'

  const [data, setData] = useState(null)
  const [insights, setInsights] = useState([])
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(() => {
    tripApi.get(id).then(setData).catch(setError)
  }, [id])
  useEffect(load, [load])

  const setTab = (t) => setParams(t === 'itinerary' ? {} : { tab: t }, { replace: true })

  const onItineraryChange = (itinerary) => setData((d) => ({ ...d, itinerary }))
  const onBudgetChange = ({ budget, insights: tips }) => {
    setData((d) => ({ ...d, budget }))
    setInsights(tips || [])
  }

  const updateStatus = async (status) => {
    const { trip } = await tripApi.update(id, { status })
    setData((d) => ({ ...d, trip }))
  }

  const remove = async () => {
    await tripApi.remove(id)
    navigate('/trips', { replace: true })
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorBox error={error} />
        <Link to="/trips" className="btn-secondary mt-4"><ArrowLeft size={14} /> Back to trips</Link>
      </div>
    )
  }
  if (!data) return <Spinner label="Opening your trip…" />

  const { trip, itinerary, budget } = data
  const d = trip.destination

  return (
    <div>
      {/* header */}
      <div className="relative overflow-hidden border-b border-sand/60 bg-cream/50">
        {d.image && (
          <img src={d.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-paper/40 to-paper" />
        <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6">
          <Link to="/trips" className="mb-4 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
            <ArrowLeft size={14} /> My trips
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1 text-sm text-soot">
                <MapPin size={14} /> <Link to={`/explore/${d.slug}`} className="hover:underline">{d.name}, {d.country}</Link>
                <span className="mx-1">·</span> {tripCountdown(trip)}
              </p>
              <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">{trip.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soot">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} /> {format(new Date(trip.startDate), 'EEE d MMM')} – {format(new Date(trip.endDate), 'EEE d MMM yyyy')}
                  <span className="text-stone">({trip.days} days)</span>
                </span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {trip.travelers} {trip.travelers > 1 ? 'travellers' : 'traveller'}</span>
                <span>{BUDGET_LABEL[trip.budgetLevel]} · {PACE_LABEL[trip.pace]} pace</span>
              </div>
              {trip.notes && <p className="mt-3 max-w-xl text-sm italic text-soot">"{trip.notes}"</p>}
            </div>

            <div className="flex items-center gap-2">
              <select value={trip.status} onChange={(e) => updateStatus(e.target.value)} className="input !w-auto !py-1.5 capitalize">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {confirmDelete ? (
                <div className="flex items-center gap-1 rounded-full border border-clay-200 bg-clay-50 px-2 py-1 text-xs">
                  <span className="text-clay-700">Delete this trip?</span>
                  <button onClick={remove} className="font-semibold text-clay-600 hover:underline">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-soot hover:underline">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="btn-danger !px-2.5" title="Delete trip"><Trash2 size={16} /></button>
              )}
            </div>
          </div>

          <nav className="mt-6 flex gap-1">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm transition',
                  tab === key ? 'bg-ink text-paper' : 'text-soot hover:bg-cream hover:text-ink'
                )}
              >
                {label}
                {key === 'itinerary' && !itinerary && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-clay-400 align-middle" />}
                {key === 'budget' && !budget && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-clay-400 align-middle" />}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 animate-rise" key={tab}>
        {tab === 'itinerary' && <ItineraryView trip={trip} itinerary={itinerary} onChange={onItineraryChange} />}
        {tab === 'budget' && <BudgetPanel trip={trip} budget={budget} insights={insights} onChange={onBudgetChange} />}
        {tab === 'overview' && <TripOverview trip={trip} hasItinerary={Boolean(itinerary)} hasBudget={Boolean(budget)} onGoTo={setTab} />}
      </div>
    </div>
  )
}
