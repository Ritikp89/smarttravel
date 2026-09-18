import { useEffect, useState } from 'react'
import { tripApi } from '../../services/api'
import { ForecastStrip } from './WeatherWidget'
import { CATEGORY_EMOJI, ErrorBox, money, Spinner } from '../ui'

// Pulls the /analysis endpoint and lays it out as a handful of cards.
export default function TripOverview({ trip, hasItinerary, hasBudget, onGoTo }) {
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setAnalysis(null)
    tripApi.analysis(trip._id).then(setAnalysis).catch(setError)
  }, [trip._id, trip.updatedAt, hasItinerary, hasBudget])

  if (error) return <ErrorBox error={error} />
  if (!analysis) return <Spinner label="Sizing up the trip…" />

  const it = analysis.itinerary
  const b = analysis.budget

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Stat label="Days away" value={analysis.days} sub={analysis.daysUntil > 0 ? `leaves in ${analysis.daysUntil} days` : analysis.daysUntil === 0 ? 'today' : 'underway or done'} />

      {it ? (
        <>
          <Stat label="Things to do" value={it.activityCount} sub={`${it.avgHoursPerDay}h a day on average`} />
          <Stat
            label="Busiest day"
            value={it.busiestDay ? `Day ${it.busiestDay.dayNumber}` : '—'}
            sub={it.busiestDay ? `${it.busiestDay.hours}h of activities` : ''}
          />
        </>
      ) : (
        <ActionCard title="No itinerary yet" body="Generate one and we'll tell you how balanced it is." cta="Go to itinerary" onClick={() => onGoTo('itinerary')} />
      )}

      {b ? (
        <>
          <Stat label="Total budget" value={money(b.total, b.currency)} sub={`${money(b.perPerson, b.currency)} per person`} accent={b.overLimit ? 'clay' : undefined} />
          <Stat
            label="Biggest cost"
            value={b.biggestLine ? `${b.biggestLine.share}%` : '—'}
            sub={b.biggestLine ? `goes on ${b.biggestLine.category}` : ''}
          />
        </>
      ) : (
        <ActionCard title="No budget yet" body="Estimate one to see where the money goes." cta="Go to budget" onClick={() => onGoTo('budget')} />
      )}

      {it && (
        <div className="card p-5 md:col-span-2">
          <p className="eyebrow mb-3">Mix of the trip</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(it.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <span key={cat} className="rounded-full bg-cream px-3 py-1 text-sm">
                  {CATEGORY_EMOJI[cat]} {cat} <span className="text-stone">×{n}</span>
                </span>
              ))}
          </div>
          <p className="mt-4 text-sm text-soot">{it.verdict}</p>
          {it.interestsMissed.length > 0 && (
            <p className="mt-1 text-sm text-soot">
              You said you cared about <span className="font-medium text-ink">{it.interestsMissed.join(', ')}</span> but nothing in the plan covers it -
              have a look at what didn't make the cut.
            </p>
          )}
          {it.freeDays > 0 && (
            <p className="mt-1 text-sm text-soot">{it.freeDays} day{it.freeDays > 1 ? 's' : ''} left free on purpose.</p>
          )}
        </div>
      )}

      {analysis.weather && !analysis.weather.error && analysis.weather.daily?.length > 0 && (
        <div className="card p-5 md:col-span-2 lg:col-span-1">
          <p className="eyebrow mb-3">Forecast for your dates</p>
          <ForecastStrip daily={analysis.weather.daily} hint={analysis.weather.hint} />
        </div>
      )}
      {!analysis.weather && (
        <div className="card p-5 text-sm text-soot">
          <p className="eyebrow mb-2">Weather</p>
          Forecasts only go about two weeks out. We'll show one here once the trip is closer.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className={`card p-5 ${accent === 'clay' ? 'border-clay-300' : ''}`}>
      <p className="eyebrow mb-2">{label}</p>
      <p className="font-display text-4xl font-semibold leading-none">{value}</p>
      {sub && <p className="mt-2 text-sm text-soot">{sub}</p>}
    </div>
  )
}

function ActionCard({ title, body, cta, onClick }) {
  return (
    <div className="card flex flex-col justify-between border-dashed p-5">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-soot">{body}</p>
      </div>
      <button onClick={onClick} className="btn-secondary mt-4 self-start !py-1.5 text-xs">{cta}</button>
    </div>
  )
}
