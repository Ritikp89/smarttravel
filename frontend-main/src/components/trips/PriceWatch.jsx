import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowLeft, BedDouble, ExternalLink, Plane, Plus, RefreshCw, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import { priceWatchApi } from '../../services/api'
import { Empty, ErrorBox, formatDate, PageHeader, Spinner } from '../ui'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR']

const formatAmount = (amount, currency, locale) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  maximumFractionDigits: currency === 'JPY' ? 0 : 2,
}).format(amount)

export default function PriceWatch() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t, locale } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState('flight')
  const [label, setLabel] = useState('')
  const [provider, setProvider] = useState('')
  const [bookingUrl, setBookingUrl] = useState('')
  const [bookedPrice, setBookedPrice] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [checkingId, setCheckingId] = useState('')
  const [priceDrafts, setPriceDrafts] = useState({})
  const [confirmDelete, setConfirmDelete] = useState('')

  const applyResult = useCallback((result) => {
    setData(result)
    setCurrency(result.currency || 'USD')
    setLoadError(null)
    setLoading(false)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      applyResult(await priceWatchApi.list(id))
    } catch (error) {
      setLoadError(error)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [id, applyResult])

  useEffect(() => {
    let active = true
    priceWatchApi.list(id)
      .then((result) => { if (active) applyResult(result) })
      .catch((error) => { if (active) setLoadError(error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, applyResult])

  const addWatch = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setActionError(null)
    try {
      const { watch } = await priceWatchApi.create(id, {
        type,
        label,
        provider,
        bookingUrl,
        bookedPrice: Number(bookedPrice),
        currentPrice: currentPrice === '' ? undefined : Number(currentPrice),
        currency,
      })
      setData((current) => ({ ...current, watches: [watch, ...current.watches] }))
      setLabel('')
      setProvider('')
      setBookingUrl('')
      setBookedPrice('')
      setCurrentPrice('')
    } catch (error) {
      setActionError(error)
    } finally {
      setSaving(false)
    }
  }

  const checkPrice = async (watch) => {
    setActionError(null)
    try {
      const { watch: updated } = await priceWatchApi.check(
        id,
        watch._id,
        Number(priceDrafts[watch._id])
      )
      setData((current) => ({
        ...current,
        watches: current.watches.map((item) => item._id === updated._id ? updated : item),
      }))
      setCheckingId('')
    } catch (error) {
      setActionError(error)
    }
  }

  const removeWatch = async (watchId) => {
    setActionError(null)
    try {
      await priceWatchApi.remove(id, watchId)
      setData((current) => ({
        ...current,
        watches: current.watches.filter((watch) => watch._id !== watchId),
      }))
      setConfirmDelete('')
    } catch (error) {
      setActionError(error)
    }
  }

  if (loading) return <Spinner label="Loading price watches…" />
  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ErrorBox error={loadError} />
        <button type="button" onClick={load} className="btn-secondary mt-4">{t('Try again')}</button>
      </div>
    )
  }
  if (!data || String(data.trip._id) !== id) return <Spinner label="Loading price watches…" />

  const alerts = data.watches.filter((watch) => watch.lowestPrice < watch.bookedPrice)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to={`/chat?trip=${id}`} className="mb-5 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
        <ArrowLeft size={14} /> {t('Back to group chat')}
      </Link>
      <PageHeader eyebrow="Travel together" title="Price-drop protection">
        {t('Record what you paid and the prices you find later. We’ll keep the lowest observed price and flag drops for this group.')}
      </PageHeader>

      <div className="mb-6 rounded-xl border border-butter bg-butter/20 p-4 text-sm text-soot">
        <strong>{t('Manual price checks:')}</strong> {t('enter the latest price you find. This app does not connect to booking providers or automatically file refund or credit claims. Check the provider’s terms to see whether a lower price is eligible.')}
      </div>

      {alerts.length > 0 && (
        <section className="mb-6 rounded-2xl border border-moss-300 bg-moss-50 p-4 sm:p-5" role="status">
          <div className="flex items-start gap-3">
            <ArrowDownRight size={20} className="mt-0.5 shrink-0 text-moss-700" />
            <div>
              <h2 className="font-semibold text-moss-700">
                {t(alerts.length === 1 ? 'Price drop recorded for {count} booking' : 'Price drop recorded for {count} bookings', { count: alerts.length })}
              </h2>
              <p className="mt-1 text-sm text-moss-700">
                {t('The lowest price entered is below the booked price. Review the provider’s refund or credit policy.')}
              </p>
            </div>
          </div>
        </section>
      )}

      <ErrorBox error={actionError} className="mb-4" />

      <section className="card mb-8 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">{t('Track a booking')}</h2>
        <form onSubmit={addWatch} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('Booking type')}</span>
              <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
                <option value="flight">{t('Flight')}</option>
                <option value="hotel">{t('Hotel')}</option>
              </select>
            </label>
            <label className="block">
              <span className="label">{t('Name / route')}</span>
              <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} placeholder={t('New York to London')} required />
            </label>
            <label className="block">
              <span className="label">{t('Price paid')}</span>
              <input className="input" type="number" min={currency === 'JPY' ? 1 : 0.01} step={currency === 'JPY' ? 1 : 0.01} value={bookedPrice} onChange={(event) => setBookedPrice(event.target.value)} placeholder="0.00" required />
            </label>
            <label className="block">
              <span className="label">{t('Currency')}</span>
              <select className="input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('Provider')} <span className="font-normal normal-case text-stone">{t('(optional)')}</span></span>
              <input className="input" value={provider} onChange={(event) => setProvider(event.target.value)} maxLength={80} placeholder={t('Airline or hotel')} />
            </label>
            <label className="block">
              <span className="label">{t('Booking link')} <span className="font-normal normal-case text-stone">{t('(optional)')}</span></span>
              <input className="input" type="url" value={bookingUrl} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://…" />
            </label>
            <label className="block">
              <span className="label">{t('Price found now')} <span className="font-normal normal-case text-stone">{t('(optional)')}</span></span>
              <input className="input" type="number" min={currency === 'JPY' ? 1 : 0.01} step={currency === 'JPY' ? 1 : 0.01} value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} placeholder={t('Same as price paid')} />
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={saving || !label.trim()}>
            <Plus size={15} /> {saving ? t('Saving…') : t('Start tracking')}
          </button>
        </form>
      </section>

      <h2 className="mb-3 font-display text-2xl font-semibold">{t('Tracked bookings')}</h2>
      {data.watches.length === 0 ? (
        <Empty title="Nothing tracked yet" illustration="🔎">
          {t('Add a booked flight or hotel and record later prices to spot possible savings.')}
        </Empty>
      ) : (
        <div className="space-y-4">
          {data.watches.map((watch) => {
            const dropped = watch.lowestPrice < watch.bookedPrice
            const savings = watch.bookedPrice - watch.lowestPrice
            const canManage =
              data.isOwner || String(watch.createdBy?._id) === String(user?._id)
            const TypeIcon = watch.type === 'flight' ? Plane : BedDouble
            return (
              <article key={watch._id} className={clsx('card overflow-hidden', dropped && 'border-moss-300')}>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-sand/70 px-4 py-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-ink">
                      <TypeIcon size={18} />
                    </span>
                    <div>
                      <h3 className="font-semibold">{watch.label}</h3>
                      <p className="mt-1 text-xs text-stone">
                        {t(watch.type === 'flight' ? 'Flight' : 'Hotel')}
                        {watch.provider ? ` · ${watch.provider}` : ''}
                        {watch.createdBy?.name ? ` · ${t('Added by {name}', { name: watch.createdBy.name })}` : ''}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    confirmDelete === watch._id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <button type="button" onClick={() => removeWatch(watch._id)} className="font-semibold text-clay-700">{t('Remove')}</button>
                        <button type="button" onClick={() => setConfirmDelete('')} className="text-stone">{t('Cancel')}</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(watch._id)} className="btn-ghost !p-1.5 text-stone" aria-label={t('Remove {name}', { name: watch.label })}>
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </header>

                <div className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-5">
                  <div className="rounded-xl bg-cream/70 p-3">
                    <p className="text-xs text-stone">{t('Price paid')}</p>
                    <p className="mt-1 font-semibold tabular-nums">{formatAmount(watch.bookedPrice, watch.currency, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-cream/70 p-3">
                    <p className="text-xs text-stone">{t('Latest price entered')}</p>
                    <p className="mt-1 font-semibold tabular-nums">{formatAmount(watch.latestPrice, watch.currency, locale)}</p>
                  </div>
                  <div className={clsx('rounded-xl p-3', dropped ? 'bg-moss-50' : 'bg-cream/70')}>
                    <p className="text-xs text-stone">{t('Lowest observed')}</p>
                    <p className={clsx('mt-1 font-semibold tabular-nums', dropped && 'text-moss-700')}>
                      {formatAmount(watch.lowestPrice, watch.currency, locale)}
                      {dropped && <span className="ml-1 text-xs">· {formatAmount(savings, watch.currency, locale)} {t('lower')}</span>}
                    </p>
                  </div>
                </div>

                {dropped && (
                  <div className="mx-4 mb-4 rounded-xl border border-moss-300 bg-moss-50 px-3 py-2.5 text-sm text-moss-700 sm:mx-5">
                    {t('A price drop was recorded. Check with the provider whether your booking qualifies for a refund or credit.')}
                    {watch.lowestPriceAt && <span className="mt-1 block text-xs text-moss-700">{t('Lowest price recorded {date}.', { date: formatDate(watch.lowestPriceAt, 'PP', locale) })}</span>}
                  </div>
                )}

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-sand/70 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone">
                    <span>{watch.lastCheckedAt ? t('Last checked {date}', { date: formatDate(watch.lastCheckedAt, 'PP p', locale) }) : t('No price check entered yet')}</span>
                    {watch.bookingUrl && (
                      <a href={watch.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink hover:underline">
                        {t('Open booking')} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {canManage && (
                    checkingId === watch._id ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          checkPrice(watch)
                        }}
                      >
                        <input
                          className="input !w-32 !py-1.5 text-right"
                          type="number"
                          min={watch.currency === 'JPY' ? 1 : 0.01}
                          step={watch.currency === 'JPY' ? 1 : 0.01}
                          value={priceDrafts[watch._id] ?? ''}
                          onChange={(event) => setPriceDrafts((current) => ({ ...current, [watch._id]: event.target.value }))}
                          aria-label={t('Latest {currency} price for {name}', { currency: watch.currency, name: watch.label })}
                          required
                        />
                        <button type="submit" className="btn-primary !py-1.5">{t('Save')}</button>
                        <button type="button" className="btn-ghost !p-1.5" onClick={() => setCheckingId('')}>{t('Cancel')}</button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary !py-1.5"
                        onClick={() => {
                          setPriceDrafts((current) => ({ ...current, [watch._id]: String(watch.latestPrice) }))
                          setCheckingId(watch._id)
                        }}
                      >
                        <RefreshCw size={13} /> {t('Enter latest price')}
                      </button>
                    )
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
