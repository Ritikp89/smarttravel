import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, Mic, Search, VolumeX } from 'lucide-react'
import { searchApi } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { ErrorBox, PageHeader, Spinner } from './ui'

export default function GlobalSearch() {
  const { language, t } = useLanguage()
  const [, setParams] = useSearchParams()
  const [initialQuery] = useState(() => new URLSearchParams(window.location.search).get('q'))
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(Boolean(initialQuery))
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  const search = useCallback(async (value) => {
    const term = value.trim()
    if (term.length < 2) {
      setError(t('Enter at least two characters to search'))
      setResults(null)
      return
    }

    setLoading(true)
    setError('')
    setParams({ q: term }, { replace: true })
    try {
      setResults(await searchApi.search(term))
    } catch (err) {
      setError(err.message)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [setParams, t])

  useEffect(() => {
    if (!initialQuery) return undefined
    let active = true
    searchApi.search(initialQuery)
      .then((data) => {
        if (active) setResults(data)
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setResults(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [initialQuery])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const startVoiceSearch = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setError(t('Voice search is not supported in this browser.'))
      return
    }

    const recognition = new Recognition()
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (!transcript) {
        setError(t('No speech was recognized. Please try again.'))
        return
      }
      setQuery(transcript)
      search(transcript)
    }
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed'
        ? t('Microphone access was denied. Allow it in your browser settings and try again.')
        : t('No speech was recognized. Please try again.'))
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    try {
      recognitionRef.current = recognition
      setListening(true)
      setError('')
      recognition.start()
    } catch {
      recognitionRef.current = null
      setListening(false)
      setError(t('Voice search is not supported in this browser.'))
    }
  }

  const toggleVoiceSearch = () => {
    if (listening) recognitionRef.current?.stop()
    else startVoiceSearch()
  }

  const resultCount = results
    ? results.destinations.length + results.activities.length + results.trips.length
    : 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow={t('Search')} title={t('Search the whole app')}>
        {t('Search destinations, activities, and your trips.')}
      </PageHeader>

      <section className="card p-4 sm:p-5">
        <form onSubmit={(event) => { event.preventDefault(); search(query) }} className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t('Search')}</span>
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone" />
            <input
              className="input !pl-10"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search destinations, activities, or your trips…')}
              maxLength={100}
            />
          </label>
          <button type="button" className="btn-secondary !px-3" onClick={toggleVoiceSearch} aria-label={t('Start voice search')} title={t('Start voice search')} disabled={loading}>
            {listening ? <VolumeX size={18} /> : <Mic size={18} />}
          </button>
          <button type="submit" className="btn-primary !px-3" disabled={loading}>
            <Search size={17} /><span className="hidden sm:inline">{t('Search')}</span>
          </button>
        </form>
        <p className="mt-3 text-xs text-stone">
          {t('Speak a destination, activity, or trip name.')}
          {' '}{t('Only recognized text is sent to Smart Travel.')}
          {' '}{t('Speech recognition may be processed by your browser provider.')}
        </p>
        {listening && <p className="mt-2 text-sm font-medium text-clay-700">{t('Listening')}…</p>}
      </section>

      <ErrorBox error={error} className="mt-5" />

      {loading ? (
        <Spinner label="Searching…" />
      ) : results ? (
        <div className="mt-8 space-y-8">
          <p className="text-sm text-stone">{t('Search results')}: {resultCount}</p>
          {results.destinations.length > 0 && (
            <ResultSection title="Destinations">
              {results.destinations.map((destination) => (
                <Link key={destination._id} to={`/explore/${destination.slug}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                  <MapPin className="shrink-0 text-clay-600" size={18} />
                  <span><strong>{destination.name}</strong><span className="ml-2 text-sm text-stone">{destination.country}</span></span>
                </Link>
              ))}
            </ResultSection>
          )}
          {results.activities.length > 0 && (
            <ResultSection title="Activities">
              {results.activities.map((activity) => (
                <Link key={activity._id} to={`/explore/${activity.destination?.slug}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                  <span className="min-w-0 flex-1">
                    <strong>{activity.name}</strong>
                    <span className="ml-2 text-sm text-stone">{activity.destination?.name}, {activity.destination?.country}</span>
                  </span>
                  <span className="text-xs capitalize text-stone">{t(activity.category)}</span>
                </Link>
              ))}
            </ResultSection>
          )}
          {results.trips.length > 0 && (
            <ResultSection title="Trips">
              {results.trips.map((trip) => (
                <Link key={trip._id} to={`/trips/${trip._id}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                  <MapPin className="shrink-0 text-clay-600" size={18} />
                  <span><strong>{trip.title || trip.destination?.name}</strong><span className="ml-2 text-sm text-stone">{trip.destination?.name}, {trip.destination?.country}</span></span>
                </Link>
              ))}
            </ResultSection>
          )}
          {!resultCount && (
            <div className="card p-6 text-center">
              <p className="font-semibold">{t('No results found')}</p>
              <p className="mt-2 text-sm text-stone">{t('Try another destination, activity, or trip name.')}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-stone">{t('Search to see results.')}</p>
      )}
    </div>
  )
}

function ResultSection({ title, children }) {
  const { t } = useLanguage()
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{t(title)}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}
