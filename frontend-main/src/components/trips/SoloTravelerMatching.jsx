import { useCallback, useEffect, useState } from 'react'
import { Ban, Flag, HeartHandshake, MapPin, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { identityVerificationApi, soloTravelerApi } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'
import { ErrorBox, Empty, formatDate, PageHeader, Spinner } from '../ui'
import IdentityVerificationPanel from '../user/IdentityVerificationPanel'

const AGE_LABELS = { '18-24': '18–24', '25-34': '25–34', '35-44': '35–44', '45+': '45+' }

const ACTIVITY_LABELS = {
  day_tour: 'Day tour',
  meal: 'Meal',
  shared_ride: 'Shared ride',
}

const dateRange = (start, end, locale) => `${formatDate(start, 'MMM d', locale)} – ${formatDate(end, 'MMM d, yyyy', locale)}`

export default function SoloTravelerMatching() {
  const { t, locale } = useLanguage()
  const [verification, setVerification] = useState(null)
  const [trips, setTrips] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [candidates, setCandidates] = useState([])
  const [candidateOptions, setCandidateOptions] = useState({})
  const [drafts, setDrafts] = useState({})
  const [reportForms, setReportForms] = useState({})
  const [tab, setTab] = useState('discover')
  const [loading, setLoading] = useState(true)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextVerification, nextTrips, nextMatches] = await Promise.all([
        identityVerificationApi.status(),
        soloTravelerApi.trips(),
        soloTravelerApi.requests(),
      ])
      setVerification(nextVerification)
      setTrips(nextTrips)
      setMatches(nextMatches)
      setSelectedTripId((current) =>
        nextTrips.some((trip) => String(trip._id) === current)
          ? current
          : String(nextTrips.find((trip) => trip.matchingEnabled)?._id || nextTrips[0]?._id || '')
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selectedTrip = trips.find((trip) => String(trip._id) === selectedTripId)
  const loadCandidates = useCallback(async (tripId) => {
    setCandidateLoading(true)
    setError('')
    try {
      setCandidates(await soloTravelerApi.candidates(tripId))
    } catch (err) {
      setCandidates([])
      setError(err.message)
    } finally {
      setCandidateLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTrip?.matchingEnabled) loadCandidates(String(selectedTrip._id))
    else setCandidates([])
  }, [selectedTrip, loadCandidates])

  const setVisibility = async (trip, enabled) => {
    setBusyAction(String(trip._id))
    setError('')
    try {
      await soloTravelerApi.setVisibility(String(trip._id), enabled)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction('')
    }
  }

  const sendRequest = async (trip, candidate) => {
    const options = candidateOptions[candidate.tripId] || {}
    setBusyAction(`request-${candidate.tripId}`)
    setError('')
    try {
      await soloTravelerApi.request(String(trip._id), {
        candidateTripId: String(candidate.tripId),
        activityType: options.activityType || 'day_tour',
        message: options.message || '',
      })
      await load()
      await loadCandidates(String(trip._id))
      setTab('connections')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction('')
    }
  }

  const respond = async (matchId, action) => {
    setBusyAction(String(matchId))
    setError('')
    try {
      await soloTravelerApi.respond(String(matchId), action)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction('')
    }
  }

  const sendMessage = async (event, match) => {
    event.preventDefault()
    const content = (drafts[match._id] || '').trim()
    if (!content) return
    setBusyAction(`message-${match._id}`)
    setError('')
    try {
      await soloTravelerApi.sendMessage(String(match._id), content)
      setDrafts((current) => ({ ...current, [match._id]: '' }))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction('')
    }
  }

  const block = async (match) => {
    if (!window.confirm(t('Block {name}? This also closes the connection.', { name: match.otherTraveler.firstName }))) return
    setBusyAction(`block-${match._id}`)
    setError('')
    try {
      await soloTravelerApi.block(String(match._id))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction('')
    }
  }

  const report = async (event, match) => {
    event.preventDefault()
    const form = reportForms[match._id] || {}
    setBusyAction(`report-${match._id}`)
    setError('')
    try {
      await soloTravelerApi.report(String(match._id), {
        reason: form.reason || 'inappropriate_behavior',
        details: form.details || '',
      })
      setReportForms((current) => ({ ...current, [match._id]: { ...current[match._id], submitted: true } }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction('')
    }
  }

  if (loading) return <Spinner label="Loading traveler matching…" />

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Meet fellow solo travelers" title="Travel together, by choice">
        Find verified adults with overlapping trips and shared interests. You control which solo trips are visible.
      </PageHeader>

      <ErrorBox error={error} className="mb-6" />

      <div className="mb-6">
        <IdentityVerificationPanel verification={verification} onRefresh={load} />
      </div>

      <div className="mb-6 flex gap-2 border-b border-sand pb-2">
        <button type="button" className={tab === 'discover' ? 'chip-on' : 'chip-idle'} onClick={() => setTab('discover')}>
          {t('Discover')}
        </button>
        <button type="button" className={tab === 'connections' ? 'chip-on' : 'chip-idle'} onClick={() => setTab('connections')}>
          {t('Requests and chats ({count})', { count: matches.length })}
        </button>
        <button type="button" className="btn-ghost ml-auto !px-2" onClick={load} title={t('Refresh')}>
          <RefreshCw size={16} />
        </button>
      </div>

      {tab === 'discover' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section>
            <h2 className="mb-3 text-xl font-semibold">{t('Your upcoming solo trips')}</h2>
            {!trips.length ? (
              <Empty title="No upcoming solo trips">
                {t('Plan a trip for one traveler to opt into matching. Only trips you enable will be shown.')}
              </Empty>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <article
                    key={trip._id}
                    className={`card p-4 ${selectedTripId === String(trip._id) ? 'ring-2 ring-ink' : ''}`}
                  >
                    <button type="button" className="w-full text-left" onClick={() => setSelectedTripId(String(trip._id))}>
                      <p className="font-semibold">{trip.destination?.name}, {trip.destination?.country}</p>
                      <p className="mt-1 text-sm text-stone">{dateRange(trip.startDate, trip.endDate, locale)}</p>
                    </button>
                    <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 border-t border-sand pt-3 text-sm">
                      <span>{t(trip.matchingEnabled ? 'Visible to eligible travelers' : 'Not visible')}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(trip.matchingEnabled)}
                        disabled={!verification?.eligible || busyAction === String(trip._id)}
                        onChange={(event) => setVisibility(trip, event.target.checked)}
                        aria-label={t('Enable matching for {destination}', { destination: trip.destination?.name })}
                        className="h-4 w-4 accent-ink"
                      />
                    </label>
                  </article>
                ))}
              </div>
            )}
            <div className="mt-4 rounded-xl bg-cream p-4 text-sm text-soot">
              <p className="font-semibold text-ink">{t('Privacy and safety')}</p>
              <p className="mt-1">{t('Discovery shares your first name, age band, destination city, dates, and shared interests—never your email or exact location.')}</p>
              <p className="mt-2">{t('Meet in public and make your own safety checks. Verification does not validate bookings, rides, or another person’s plans.')}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t('Travelers who may fit')}</h2>
            {!selectedTrip ? (
              <Empty title="Choose a trip">{t('Select one of your upcoming trips to manage its matching visibility.')}</Empty>
            ) : !selectedTrip.matchingEnabled ? (
              <Empty title="This trip is private">
                {t('Turn on visibility for this trip to look for compatible travelers. You can turn it off at any time.')}
              </Empty>
            ) : candidateLoading ? (
              <Spinner label="Finding compatible travelers…" className="py-12" />
            ) : !candidates.length ? (
              <Empty title="No matches yet">
                {t('Matching requires a verified adult with the same destination city, overlapping dates, and at least one shared interest.')}
              </Empty>
            ) : (
              <div className="space-y-4">
                {candidates.map((candidate) => {
                  const options = candidateOptions[candidate.tripId] || {}
                  return (
                    <article key={candidate.tripId} className="card p-5">
                      <div className="flex items-start gap-3">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-paper"
                          style={{ backgroundColor: candidate.avatarColor || '#c9532a' }}
                        >
                          {candidate.firstName.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{candidate.firstName} <span className="font-normal text-stone">· {AGE_LABELS[candidate.ageBand] || candidate.ageBand}</span></h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-soot"><MapPin size={14} /> {candidate.city}, {candidate.country}</p>
                          <p className="mt-1 text-sm text-stone">{dateRange(candidate.startDate, candidate.endDate, locale)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {candidate.sharedInterests.map((interest) => <span className="chip-on" key={interest}>{t(interest)}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <select
                          className="input"
                          value={options.activityType || 'day_tour'}
                          onChange={(event) => setCandidateOptions((current) => ({
                            ...current,
                            [candidate.tripId]: { ...current[candidate.tripId], activityType: event.target.value },
                          }))}
                          aria-label={t('Activity with {name}', { name: candidate.firstName })}
                        >
                          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled={busyAction === `request-${candidate.tripId}`}
                          onClick={() => sendRequest(selectedTrip, candidate)}
                          className="btn-primary"
                        >
                          <HeartHandshake size={16} /> {busyAction === `request-${candidate.tripId}` ? t('Sending…') : t('Request to connect')}
                        </button>
                      </div>
                      <input
                        className="input mt-3"
                        maxLength={500}
                        placeholder={t('Optional short introduction')}
                        value={options.message || ''}
                        onChange={(event) => setCandidateOptions((current) => ({
                          ...current,
                          [candidate.tripId]: { ...current[candidate.tripId], message: event.target.value },
                        }))}
                      />
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-xl font-semibold">{t('Your connections')}</h2>
          {!matches.length ? (
            <Empty title="No requests yet">{t('When you request to connect or receive a request, it will appear here.')}</Empty>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <article key={match._id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{match.otherTraveler.firstName} <span className="text-sm font-normal text-stone">· {AGE_LABELS[match.otherTraveler.ageBand] || match.otherTraveler.ageBand}</span></h3>
                      <p className="mt-1 text-sm text-soot">
                        {match.city}, {match.country} · {t('Your trip: {dates}', { dates: dateRange(match.startDate, match.endDate, locale) })}
                        {' · '}{t('Their trip: {dates}', { dates: dateRange(match.otherTrip.startDate, match.otherTrip.endDate, locale) })}
                      </p>
                      <p className="mt-1 text-sm text-stone">{t(ACTIVITY_LABELS[match.activityType])} · {t(match.incoming ? 'Incoming request' : 'Request sent')} · {t(match.status)}</p>
                      {match.introMessage && <p className="mt-3 rounded-lg bg-cream p-3 text-sm">{match.introMessage}</p>}
                    </div>
                    {match.status !== 'declined' && match.status !== 'withdrawn' && match.status !== 'blocked' && (
                      <button type="button" className="btn-ghost text-clay-700" onClick={() => block(match)} disabled={busyAction === `block-${match._id}`}>
                        <Ban size={15} /> {t('Block')}
                      </button>
                    )}
                  </div>

                  {match.status === 'pending' && match.incoming && (
                    <div className="mt-4 flex gap-2">
                      <button type="button" className="btn-primary" onClick={() => respond(match._id, 'accept')} disabled={busyAction === match._id}>{t('Accept')}</button>
                      <button type="button" className="btn-secondary" onClick={() => respond(match._id, 'decline')} disabled={busyAction === match._id}>{t('Decline')}</button>
                    </div>
                  )}

                  {match.status === 'accepted' && (
                    <div className="mt-4 border-t border-sand pt-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageCircle size={16} /> {t('Private conversation')}</div>
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-cream p-3">
                        {match.messages.length ? match.messages.map((message) => (
                          <div key={message._id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${message.isMine ? 'ml-auto bg-ink text-paper' : 'bg-white text-ink'}`}>
                            <p className="mb-1 text-xs opacity-70">{message.isMine ? t('You') : message.senderName}</p>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        )) : <p className="text-sm text-stone">{t('Say hello to start the conversation.')}</p>}
                      </div>
                      <form onSubmit={(event) => sendMessage(event, match)} className="mt-3 flex gap-2">
                        <input
                          className="input"
                          maxLength={1000}
                          value={drafts[match._id] || ''}
                          onChange={(event) => setDrafts((current) => ({ ...current, [match._id]: event.target.value }))}
                          placeholder={t('Write a message')}
                          aria-label={t('Message {name}', { name: match.otherTraveler.firstName })}
                        />
                        <button type="submit" className="btn-primary" disabled={busyAction === `message-${match._id}`}>
                          <Send size={16} /> {t('Send')}
                        </button>
                      </form>
                    </div>
                  )}

                  <details className="mt-4 border-t border-sand pt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm text-stone"><Flag size={14} /> {t('Report a safety concern')}</summary>
                    {reportForms[match._id]?.submitted ? (
                      <p className="mt-3 text-sm text-moss-700">{t('Report recorded.')}</p>
                    ) : (
                      <form onSubmit={(event) => report(event, match)} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <select
                          className="input"
                          value={reportForms[match._id]?.reason || 'inappropriate_behavior'}
                          onChange={(event) => setReportForms((current) => ({
                            ...current,
                            [match._id]: { ...current[match._id], reason: event.target.value },
                          }))}
                        >
                          <option value="inappropriate_behavior">{t('Inappropriate behavior')}</option>
                          <option value="fake_profile">{t('Suspected fake profile')}</option>
                          <option value="unsafe_request">{t('Unsafe request')}</option>
                          <option value="other">{t('Other')}</option>
                        </select>
                        <input
                          className="input"
                          maxLength={1000}
                          placeholder={t('Optional details')}
                          value={reportForms[match._id]?.details || ''}
                          onChange={(event) => setReportForms((current) => ({
                            ...current,
                            [match._id]: { ...current[match._id], details: event.target.value },
                          }))}
                        />
                        <button type="submit" className="btn-secondary sm:col-span-2" disabled={busyAction === `report-${match._id}`}>
                          {t('Submit report')}
                        </button>
                      </form>
                    )}
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
