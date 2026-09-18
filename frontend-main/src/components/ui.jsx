// Small shared pieces that didn't deserve their own file.
import { AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function Spinner({ label = 'Loading…', className }) {
  return (
    <div className={clsx('flex items-center justify-center gap-2 py-16 text-sm text-stone', className)}>
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  )
}

export function ErrorBox({ error, onRetry, className }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  return (
    <div className={clsx('flex items-start gap-3 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700', className)}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {message}
        {onRetry && (
          <button onClick={onRetry} className="ml-2 underline underline-offset-2 hover:text-ink">
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

export function Empty({ title, children, action, illustration = '✈' }) {
  return (
    <div className="card mx-auto max-w-md px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cream text-2xl">{illustration}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {children && <p className="mt-2 text-sm text-soot">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, children, aside }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {children && <p className="mt-2 max-w-xl text-soot">{children}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

export const money = (n, currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0)

export const BUDGET_LABEL = { budget: 'Shoestring', mid: 'Comfortable', luxury: 'Treat yourself' }
export const PACE_LABEL = { relaxed: 'Relaxed', balanced: 'Balanced', packed: 'Packed' }
export const INTERESTS = ['culture', 'food', 'nature', 'adventure', 'beach', 'nightlife', 'history', 'shopping', 'art', 'wellness']

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
