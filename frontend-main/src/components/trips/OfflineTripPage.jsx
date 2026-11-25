import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CalendarDays, FileText, MapPin, Wallet, WifiOff } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { formatDate, money } from '../ui'
import { getOfflinePack } from '../../services/offlineStorage'

export default function OfflineTripPage() {
  const { id } = useParams()
  const location = useLocation()
  const { t, locale } = useLanguage()
  const [pack, setPack] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const accessKey = new URLSearchParams(location.search).get('key')
  const error = !accessKey ? t('This offline trip pack link is incomplete.') : loadError

  useEffect(() => {
    let active = true
    if (!accessKey) return () => { active = false }

    getOfflinePack(id, accessKey)
      .then((savedPack) => {
        if (!active) return
        if (!savedPack) {
          setLoadError(t('No offline pack was found on this device.'))
          return
        }
        setPack(savedPack)
      })
      .catch((storageError) => {
        if (active) setLoadError(t(storageError.message))
      })

    return () => { active = false }
  }, [accessKey, id, t])

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold">{t('Offline trip pack')}</h1>
        <p role="alert" className="mt-4 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">{error}</p>
      </main>
    )
  }
  if (!pack) {
    return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-stone">{t('Loading offline trip…')}</main>
  }

  const { trip, itinerary, budget } = pack
  const destination = trip.destination
  const locations = [
    ...(destination?.coordinates ? [{ name: destination.name, coordinates: destination.coordinates }] : []),
    ...(itinerary?.days || []).flatMap((day) => (day.slots || [])
      .filter((slot) => slot.activity?.coordinates)
      .map((slot) => ({ name: slot.activity.name, coordinates: slot.activity.coordinates }))),
  ]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="card mb-6 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <WifiOff size={21} className="mt-1 shrink-0 text-clay-600" />
          <div className="min-w-0">
            <p className="eyebrow">{t('Offline trip pack')}</p>
            <h1 className="mt-1 text-3xl font-semibold">{trip.title}</h1>
            <p className="mt-2 text-sm text-soot">
              {destination ? `${destination.name}, ${destination.country}` : t('Unknown destination')}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-stone">
              <CalendarDays size={14} />
              {formatDate(trip.startDate, 'EEE d MMM yyyy', locale)} – {formatDate(trip.endDate, 'EEE d MMM yyyy', locale)}
            </p>
            <p className="mt-3 text-xs text-stone">
              {t('Saved on this device {date}', { date: formatDate(pack.savedAt, 'PPp', locale) })}
            </p>
          </div>
        </div>
      </header>

      <section className="card mb-6 p-5" aria-labelledby="offline-itinerary-title">
        <h2 id="offline-itinerary-title" className="text-xl font-semibold">{t('Saved itinerary')}</h2>
        {!itinerary?.days?.length ? (
          <p className="mt-3 text-sm text-stone">{t('No itinerary was saved for this trip.')}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {itinerary.days.map((day) => (
              <section key={day._id || day.dayNumber} className="rounded-xl border border-sand p-4">
                <h3 className="font-semibold">{t('Day {day}', { day: day.dayNumber })} · {formatDate(day.date, 'EEEE d MMM', locale)}</h3>
                {day.theme && <p className="mt-1 text-xs text-stone">{t(day.theme)}</p>}
                <ul className="mt-3 space-y-2">
                  {(day.slots || []).map((slot, index) => {
                    const activity = slot.activity
                    return (
                      <li key={slot._id || `${day.dayNumber}-${index}`} className="flex gap-3 text-sm">
                        <span className="w-12 shrink-0 text-right tabular-nums text-stone">{slot.startTime || '—'}</span>
                        <span className="min-w-0 flex-1">
                          {activity?.name || t('Activity details are no longer available.')}
                          {activity?.coordinates && (
                            <span className="ml-2 text-xs text-stone">
                              ({activity.coordinates.lat}, {activity.coordinates.lng})
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {budget && (
        <section className="card mb-6 p-5" aria-labelledby="offline-budget-title">
          <h2 id="offline-budget-title" className="flex items-center gap-2 text-xl font-semibold">
            <Wallet size={18} /> {t('Saved budget')} · {money(budget.total, budget.currency, locale)}
          </h2>
          <ul className="mt-4 divide-y divide-sand/60">
            {budget.lines.map((line) => (
              <li key={line.category} className="flex justify-between gap-4 py-2 text-sm">
                <span>{t(line.label)}</span>
                <span className="shrink-0 font-medium">{money(line.amount, budget.currency, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-6 p-5" aria-labelledby="offline-documents-title">
        <h2 id="offline-documents-title" className="text-xl font-semibold">{t('Boarding passes and hotel vouchers')}</h2>
        {!pack.documents?.length ? (
          <p className="mt-3 text-sm text-stone">{t('No documents were added to this offline pack.')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pack.documents.map((file) => (
              <li key={file.id} className="flex items-center gap-2 text-sm">
                <FileText size={15} className="shrink-0 text-stone" />
                {file.blob instanceof Blob ? (
                  <button type="button" onClick={() => downloadDocument(file)} className="break-all text-left font-medium text-clay-700 underline underline-offset-2">
                    {file.name}
                  </button>
                ) : (
                  <span>{file.name} · {t('File data is unavailable.')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mb-6 p-5" aria-labelledby="offline-phrasebook-title">
        <h2 id="offline-phrasebook-title" className="text-xl font-semibold">{t('Emergency phrasebook (English and Hindi)')}</h2>
        <ul className="mt-3 divide-y divide-sand/60">
          {pack.phrases.map((phrase, index) => (
            <li key={`${phrase.english}-${index}`} className="grid gap-1 py-3 text-sm sm:grid-cols-2 sm:gap-4">
              <span>{phrase.english}</span>
              <span lang="hi">{phrase.hindi}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-sand bg-cream/60 p-4 text-sm text-soot" aria-label={t('Offline map information')}>
        <p className="flex items-center gap-2 font-semibold"><MapPin size={15} /> {t('Saved locations')}</p>
        {locations.length ? (
          <ul className="mt-2 space-y-1">
            {locations.map((location, index) => (
              <li key={`${location.name}-${index}`}>
                {location.name}: {location.coordinates.lat}, {location.coordinates.lng}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">{t('No location coordinates were available when this pack was saved.')}</p>
        )}
        <p className="mt-2 text-xs">{t('Offline base map tiles are not included until a licensed map source is configured.')}</p>
      </section>
    </main>
  )
}

function downloadDocument(file) {
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}
