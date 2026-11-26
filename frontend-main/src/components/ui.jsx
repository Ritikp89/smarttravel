// Small shared pieces that didn't deserve their own file.
import { AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { format as formatDateFns } from 'date-fns'
import { hi } from 'date-fns/locale/hi'
import { useLanguage } from '../context/LanguageContext'

export function Spinner({ label = 'Loading…', className }) {
  const { t } = useLanguage()
  return (
    <div className={clsx('flex items-center justify-center gap-2 py-16 text-sm text-stone', className)}>
      <Loader2 size={16} className="animate-spin" /> {t(label)}
    </div>
  )
}

export function ErrorBox({ error, onRetry, className }) {
  const { t } = useLanguage()
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  return (
    <div className={clsx('flex items-start gap-3 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700', className)}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {t(message)}
        {onRetry && (
          <button onClick={onRetry} className="ml-2 underline underline-offset-2 hover:text-ink">
            {t('Try again')}
          </button>
        )}
      </div>
    </div>
  )
}

export function Empty({ title, children, action, illustration = '✈' }) {
  const { t } = useLanguage()
  return (
    <div className="card mx-auto max-w-md px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cream text-2xl">{illustration}</div>
      <h3 className="text-xl font-semibold">{t(title)}</h3>
      {typeof children === 'string' ? <p className="mt-2 text-sm text-soot">{t(children)}</p> : children && <p className="mt-2 text-sm text-soot">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, children, aside }) {
  const { t } = useLanguage()
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{t(eyebrow)}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{t(title)}</h1>
        {typeof children === 'string' ? <p className="mt-2 max-w-xl text-soot">{t(children)}</p> : children && <p className="mt-2 max-w-xl text-soot">{children}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

export const money = (n, currency = 'USD', locale = 'en') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0)

export const formatDate = (value, pattern, locale = 'en') =>
  formatDateFns(new Date(value), pattern, locale === 'hi-IN' ? { locale: hi } : undefined)

export const BUDGET_LABEL = { budget: 'Shoestring', mid: 'Moderate', luxury: 'Treat yourself' }
export const PACE_LABEL = { relaxed: 'Relaxed', balanced: 'Balanced', packed: 'Packed' }
export const INTERESTS = ['culture', 'food', 'nature', 'adventure', 'beach', 'nightlife', 'history', 'shopping', 'art', 'wellness']
export const TRAVEL_STYLES = {
  relaxation: { label: 'Relaxation', interests: ['wellness', 'beach', 'nature'] },
  cultural: { label: 'Cultural and historical', interests: ['culture', 'history', 'art'] },
  romantic: { label: 'Romantic for Couples', interests: ['food', 'wellness', 'culture'] },
  family: { label: 'Family-Friendly', interests: ['culture', 'nature', 'food'] },
  adventure: { label: 'Adventure and Outdoor', interests: ['adventure', 'nature', 'beach'] },
}

export const CATEGORY_EMOJI = {
  sightseeing: '🏛',
  museum: '🖼',
  food: '🍜',
  outdoors: '🌿',
  adventure: '🪂',
  beach: '🏖',
  nightlife: '🌙',
  shopping: '🛍',
  wellness: '🧖',
  tour: '🚌',
}
