import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, BedDouble, CalendarDays, ExternalLink, MapPin, MessageSquare, Navigation, Plane, Trash2, Users, Wallet, SearchCheck, PiggyBank } from 'lucide-react'
import clsx from 'clsx'
import { tripApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import ItineraryView from './ItineraryView'
import BudgetPanel from './BudgetPanel'
import TripOverview from './TripOverview'
import OfflinePackPanel from './OfflinePackPanel'
import { tripCountdown } from './TripCard'
import { BUDGET_LABEL, ErrorBox, formatDate, PACE_LABEL, Spinner } from '../ui'
import { getDestinationFallback, getDestinationImage } from '../../services/travelImages'

const TABS = [
  ['itinerary', 'Itinerary'],
  ['budget', 'Budget'],
  ['overview', 'Overview'],
]

const STATUSES = ['planning', 'booked', 'completed', 'cancelled']

const travelLinks = (trip, destination, origin) => {
  const from = origin || 'Your city'
  const to = [destination.name, destination.country].filter(Boolean).join(', ')
  const start = format(new Date(trip.startDate), 'yyyy-MM-dd')
  const end = format(new Date(trip.endDate), 'yyyy-MM-dd')
  const travellers = Number(trip.travelers) || 1

  return {
    googleFlights: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to} from ${start} to ${end} for ${travellers} travelers`)}`,
    booking: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(to)}&checkin=${start}&checkout=${end}&group_adults=${travellers}&no_rooms=${Math.max(1, Math.ceil(travellers / 2))}`,
    transport: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.coordinates?.lat != null ? `${destination.coordinates.lat},${destination.coordinates.lng}` : to)}&travelmode=transit`,
  }
}

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, locale } = useLanguage()
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
        <Link to="/trips" className="btn-secondary mt-4"><ArrowLeft size={14} /> {t('Back to trips')}</Link>
      </div>
    )
  }
  if (!data) return <Spinner label="Opening your trip…" />

  const { trip, itinerary, budget } = data
  const d = trip.destination || { name: t('Unknown destination'), country: '' }
  const bookingLinks = travelLinks(trip, d, user?.preferences?.homeCity)
  const countryImage = getDestinationImage(d, trip.coverImage)

  return (
    <div>
      {/* header */}
      <div className="relative overflow-hidden border-b border-sand/60 bg-cream/50">
        <img
          src={countryImage}
          alt=""
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = getDestinationFallback(d)
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-paper/40 to-paper" />
        <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6">
          <Link to="/trips" className="mb-4 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
            <ArrowLeft size={14} /> {t('My trips')}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1 text-sm text-soot">
                <MapPin size={14} />
                {d.slug
                  ? <Link to={`/explore/${d.slug}`} className="hover:underline">{d.name}, {d.country}</Link>
                  : <span>{d.name}</span>}
                <span className="mx-1">·</span> {tripCountdown(trip, t)}
              </p>
              <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">{trip.title}</h1>
              {!trip.destination && (
                <p className="mt-2 text-sm text-clay-700">
                  {t('The saved destination is no longer available; some itinerary activities and booking options may be missing.')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soot">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} /> {formatDate(trip.startDate, 'EEE d MMM', locale)} – {formatDate(trip.endDate, 'EEE d MMM yyyy', locale)}
                  <span className="text-stone">({t('{count} days', { count: trip.days })})</span>
                </span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {trip.travelers} {t(trip.travelers > 1 ? 'travellers' : 'traveller')}</span>
                <span>{t(BUDGET_LABEL[trip.budgetLevel])} · {t(PACE_LABEL[trip.pace])} {t('pace')}</span>
              </div>
              {trip.notes && <p className="mt-3 max-w-xl text-sm italic text-soot">"{trip.notes}"</p>}
            </div>

            <div className="flex items-center gap-2">
              <select value={trip.status} onChange={(e) => updateStatus(e.target.value)} className="input !w-auto !py-1.5 capitalize">
                {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </select>
              {confirmDelete ? (
                <div className="flex items-center gap-1 rounded-full border border-clay-200 bg-clay-50 px-2 py-1 text-xs">
                  <span className="text-clay-700">{t('Delete this trip?')}</span>
                  <button onClick={remove} className="font-semibold text-clay-600 hover:underline">{t('Yes')}</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-soot hover:underline">{t('No')}</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="btn-danger !px-2.5" title={t('Delete trip')}><Trash2 size={16} /></button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={`/chat?trip=${trip._id}`} className="btn-secondary !bg-white/80">
              <MessageSquare size={15} /> {t('Group chat')}
            </Link>
            <Link to={`/trips/${trip._id}/split`} className="btn-secondary !bg-white/80">
              <Wallet size={15} /> {t('Split costs')}
            </Link>
            <Link to={`/trips/${trip._id}/prices`} className="btn-secondary !bg-white/80">
              <SearchCheck size={15} /> {t('Price watch')}
            </Link>
            <Link to={`/trips/${trip._id}/savings`} className="btn-secondary !bg-white/80">
              <PiggyBank size={15} /> {t('Savings plan')}
            </Link>
            {trip.destination && (
              <>
                <a href={bookingLinks.googleFlights} target="_blank" rel="noopener noreferrer" className="btn-secondary !bg-white/80">
                  <Plane size={15} /> {t('Find flights')} <ExternalLink size={12} />
                </a>
                <a href={bookingLinks.booking} target="_blank" rel="noopener noreferrer" className="btn-secondary !bg-white/80">
                  <BedDouble size={15} /> {t('Find hotels')} <ExternalLink size={12} />
                </a>
                <a href={bookingLinks.transport} target="_blank" rel="noopener noreferrer" className="btn-secondary !bg-white/80">
                  <Navigation size={15} /> {t('Local transport')} <ExternalLink size={12} />
                </a>
              </>
            )}
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
                {t(label)}
                {key === 'itinerary' && !itinerary && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-clay-400 align-middle" />}
                {key === 'budget' && !budget && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-clay-400 align-middle" />}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <OfflinePackPanel data={data} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 animate-rise" key={tab}>
        {tab === 'itinerary' && <ItineraryView trip={trip} itinerary={itinerary} onChange={onItineraryChange} />}
        {tab === 'budget' && <BudgetPanel trip={trip} budget={budget} insights={insights} onChange={onBudgetChange} />}
        {tab === 'overview' && <TripOverview trip={trip} hasItinerary={Boolean(itinerary)} hasBudget={Boolean(budget)} onGoTo={setTab} />}
      </div>
    </div>
  )
}
