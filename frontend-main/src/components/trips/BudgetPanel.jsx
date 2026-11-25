import { useEffect, useState } from 'react'
import { Calculator, Pencil, RotateCcw, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { budgetApi } from '../../services/api'
import { Empty, ErrorBox, money } from '../ui'

const LINE_META = {
  accommodation: { label: 'Accommodation', emoji: '🛏', color: 'bg-clay-400' },
  food: { label: 'Food & drink', emoji: '🍴', color: 'bg-butter' },
  activities: { label: 'Activities & tickets', emoji: '🎟', color: 'bg-moss-500' },
  transport: { label: 'Getting around', emoji: '🚇', color: 'bg-sky-500' },
  flights: { label: 'Flights', emoji: '✈', color: 'bg-ink' },
  misc: { label: 'Everything else', emoji: '🧾', color: 'bg-stone' },
}

export default function BudgetPanel({ trip, budget, insights, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // category
  const [draft, setDraft] = useState('')
  const [limit, setLimit] = useState(budget?.limit ?? '')

  useEffect(() => setLimit(budget?.limit ?? ''), [budget?.limit])

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      onChange(await fn())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const estimate = () => run(() => budgetApi.estimate(trip._id, { limit: limit === '' ? undefined : Number(limit) }))

  const startEdit = (line) => {
    setEditing(line.category)
    setDraft(String(line.amount))
  }
  const commitEdit = () => {
    const amount = Number(draft)
    if (Number.isNaN(amount) || amount < 0) return setEditing(null)
    const cat = editing
    setEditing(null)
    run(() => budgetApi.update(trip._id, { lines: [{ category: cat, amount }] }))
  }
  const resetLine = (category) => run(() => budgetApi.resetLine(trip._id, category))
  const saveLimit = () => run(() => budgetApi.update(trip._id, { limit: limit === '' ? null : Number(limit) }))

  if (!budget) {
    return (
      <Empty title="No budget yet" illustration="🧮">
        We'll break down beds, meals, tickets and transport for {trip.travelers} {trip.travelers > 1 ? 'people' : 'person'} over {trip.days} days,
        using real activity prices if you've got an itinerary.
        <div className="mt-5">
          <button onClick={estimate} disabled={busy} className="btn-primary">
            <Calculator size={16} /> {busy ? 'Adding it up…' : 'Estimate budget'}
          </button>
        </div>
        <ErrorBox error={error} className="mt-4 text-left" />
      </Empty>
    )
  }

  const subtotal = budget.lines.reduce((s, l) => s + l.amount, 0)
  const over = budget.limit && budget.total > budget.limit
  const currency = budget.currency

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <ErrorBox error={error} className="mb-4" />

        {/* stacked bar */}
        <div className="mb-6 flex h-3 w-full overflow-hidden rounded-full bg-cream">
          {budget.lines.filter((l) => l.amount > 0).map((l) => (
            <span
              key={l.category}
              title={`${LINE_META[l.category]?.label}: ${money(l.amount, currency)}`}
              className={clsx('h-full transition-all', LINE_META[l.category]?.color)}
              style={{ width: `${(l.amount / subtotal) * 100}%` }}
            />
          ))}
        </div>

        <ul className={clsx('card divide-y divide-sand/50', busy && 'opacity-60')}>
          {budget.lines.map((line) => {
            const meta = LINE_META[line.category] || { label: line.category, emoji: '•', color: 'bg-stone' }
            const isEditing = editing === line.category
            return (
              <li key={line.category} className="group flex items-center gap-3 px-4 py-3.5">
                <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', meta.color)} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {meta.label}
                    {line.source === 'manual' && <span className="rounded bg-butter/50 px-1.5 py-px text-[10px] font-semibold uppercase text-ink">yours</span>}
                  </p>
                  <p className="truncate text-xs text-stone">{line.label}</p>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="number"
                      min={0}
                      className="input !w-28 !py-1 text-right"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditing(null)
                      }}
                    />
                    <button onClick={commitEdit} className="btn-ghost !p-1.5 text-moss-600"><Check size={14} /></button>
                    <button onClick={() => setEditing(null)} className="btn-ghost !p-1.5"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <span className="w-24 text-right font-semibold tabular-nums">{money(line.amount, currency)}</span>
                    <div className="flex w-14 justify-end gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => startEdit(line)} title="Edit amount" className="btn-ghost !p-1.5"><Pencil size={13} /></button>
                      {line.source === 'manual' && (
                        <button onClick={() => resetLine(line.category)} title="Back to our estimate" className="btn-ghost !p-1.5"><RotateCcw size={13} /></button>
                      )}
                    </div>
                  </>
                )}
              </li>
            )
          })}
          <li className="flex items-center justify-between px-4 py-3 text-sm text-soot">
            <span>Contingency ({budget.contingencyPct}%) - because something always comes up</span>
            <span className="tabular-nums">{money(budget.total - subtotal, currency)}</span>
          </li>
        </ul>

        <p className="mt-3 text-xs text-stone">
          Hover a line to edit it. Anything you type in stays put when you re-estimate.
        </p>
      </div>

      <aside className="space-y-4">
        <div className={clsx('card p-5', over && 'border-clay-300')}>
          <p className="eyebrow mb-1">Total</p>
          <p className="font-display text-4xl font-semibold tabular-nums">{money(budget.total, currency)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-cream/70 p-2.5">
              <p className="text-[11px] uppercase text-stone">per person</p>
              <p className="font-semibold tabular-nums">{money(budget.perPerson, currency)}</p>
            </div>
            <div className="rounded-lg bg-cream/70 p-2.5">
              <p className="text-[11px] uppercase text-stone">per day</p>
              <p className="font-semibold tabular-nums">{money(budget.perDay, currency)}</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="limit">Your ceiling</label>
            <div className="flex gap-2">
              <input
                id="limit"
                type="number"
                min={0}
                placeholder="No limit set"
                className="input !py-1.5"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveLimit()}
              />
              <button onClick={saveLimit} disabled={busy} className="btn-secondary !py-1.5">Set</button>
            </div>
            {budget.limit && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream">
                  <div className={clsx('h-full rounded-full', over ? 'bg-clay-500' : 'bg-moss-500')} style={{ width: `${Math.min(100, (budget.total / budget.limit) * 100)}%` }} />
                </div>
                <p className={clsx('mt-1 text-xs', over ? 'text-clay-600' : 'text-moss-600')}>
                  {Math.round((budget.total / budget.limit) * 100)}% of {money(budget.limit, currency)}
                </p>
              </div>
            )}
          </div>
        </div>

        {insights?.length > 0 && (
          <div className="note">
            <p className="mb-1 font-semibold text-ink">A few thoughts</p>
            <ul className="space-y-1.5">
              {insights.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        )}

        <button onClick={estimate} disabled={busy} className="btn-secondary w-full text-xs">
          <Calculator size={14} /> Re-estimate from itinerary
        </button>
      </aside>
    </div>
  )
}
