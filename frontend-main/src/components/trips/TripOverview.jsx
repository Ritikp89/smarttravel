import { useEffect, useState } from 'react'
import { tripApi } from '../../services/api'
import { ForecastStrip } from './WeatherWidget'
import { useLanguage } from '../../context/LanguageContext'
import { CATEGORY_EMOJI, ErrorBox, money, Spinner } from '../ui'

// Pulls the /analysis endpoint and lays it out as a handful of cards.
export default function TripOverview({ trip, hasItinerary, hasBudget, onGoTo }) {
  const { t, locale } = useLanguage()
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
      <Stat label={t('Days away')} value={analysis.days} sub={analysis.daysUntil > 0 ? t('leaves in {count} days', { count: analysis.daysUntil }) : analysis.daysUntil === 0 ? t('today') : t('underway or done')} />

      {it ? (
        <>
          <Stat label={t('Things to do')} value={it.activityCount} sub={t('{hours}h a day on average', { hours: it.avgHoursPerDay })} />
          <Stat
            label={t('Busiest day')}
            value={it.busiestDay ? t('Day {day}', { day: it.busiestDay.dayNumber }) : '—'}
            sub={it.busiestDay ? t('{hours}h of activities', { hours: it.busiestDay.hours }) : ''}
          />
        </>
      ) : (
        <ActionCard title={t('No itinerary yet')} body={t("Generate one and we'll tell you how balanced it is.")} cta={t('Go to itinerary')} onClick={() => onGoTo('itinerary')} />
      )}

      {b ? (
        <>
          <Stat label={t('Total budget')} value={money(b.total, b.currency, locale)} sub={t('{amount} per person', { amount: money(b.perPerson, b.currency, locale) })} accent={b.overLimit ? 'clay' : undefined} />
          <Stat
            label={t('Biggest cost')}
            value={b.biggestLine ? `${b.biggestLine.share}%` : '—'}
            sub={b.biggestLine ? t('goes on {category}', { category: t(b.biggestLine.category) }) : ''}
          />
        </>
      ) : (
        <ActionCard title={t('No budget yet')} body={t('Estimate one to see where the money goes.')} cta={t('Go to budget')} onClick={() => onGoTo('budget')} />
      )}

      {it && (
        <div className="card p-5 md:col-span-2">
          <p className="eyebrow mb-3">{t('Mix of the trip')}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(it.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <span key={cat} className="rounded-full bg-cream px-3 py-1 text-sm">
                  {CATEGORY_EMOJI[cat]} {t(cat)} <span className="text-stone">×{n}</span>
                </span>
              ))}
          </div>
          <p className="mt-4 text-sm text-soot">{t(it.verdict)}</p>
          {it.interestsMissed.length > 0 && (
            <p className="mt-1 text-sm text-soot">
              {t("You said you cared about {interests} but nothing in the plan covers it - have a look at what didn't make the cut.", { interests: it.interestsMissed.map((interest) => t(interest)).join(', ') })}
            </p>
          )}
          {it.freeDays > 0 && (
            <p className="mt-1 text-sm text-soot">{t(it.freeDays > 1 ? '{count} days left free on purpose.' : '{count} day left free on purpose.', { count: it.freeDays })}</p>
          )}
        </div>
      )}

      {analysis.weather && !analysis.weather.error && analysis.weather.daily?.length > 0 && (
        <div className="card p-5 md:col-span-2 lg:col-span-1">
          <p className="eyebrow mb-3">{t('Forecast for your dates')}</p>
          <ForecastStrip daily={analysis.weather.daily} hint={t(analysis.weather.hint)} />
        </div>
      )}
      {!analysis.weather && (
        <div className="card p-5 text-sm text-soot">
          <p className="eyebrow mb-2">{t('Weather')}</p>
          {t("Forecasts only go about two weeks out. We'll show one here once the trip is closer.")}
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
