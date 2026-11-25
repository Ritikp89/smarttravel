import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2, Users, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import { groupSplitApi } from '../../services/api'
import { Empty, ErrorBox, PageHeader, Spinner } from '../ui'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR']

const formatAmount = (amount, currency, locale) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  maximumFractionDigits: currency === 'JPY' ? 0 : 2,
}).format(amount)

const currencyScale = (currency) => (currency === 'JPY' ? 1 : 100)

const equalSharesFor = (amount, currency, participantIds) => {
  const total = Number(amount) * currencyScale(currency)
  if (!Number.isFinite(total) || total < participantIds.length || !participantIds.length) return {}
  const totalMinor = Math.round(total)
  const base = Math.floor(totalMinor / participantIds.length)
  const remainder = totalMinor % participantIds.length
  return Object.fromEntries(participantIds.map((id, index) => [
    id,
    (base + (index < remainder ? 1 : 0)) / currencyScale(currency),
  ]))
}

export default function GroupSplit() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t, locale } = useLanguage()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [splitMode, setSplitMode] = useState('equal')
  const [selectedIds, setSelectedIds] = useState([])
  const [customAmounts, setCustomAmounts] = useState({})
  const [confirmDelete, setConfirmDelete] = useState('')

  const applyResult = useCallback((result) => {
    setData(result)
    setSelectedIds(result.participants.map((person) => person._id))
    setCurrency(result.currency || 'USD')
    setLoadError(null)
    setLoading(false)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      applyResult(await groupSplitApi.get(id))
    } catch (error) {
      setLoadError(error)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [id, applyResult])

  useEffect(() => {
    let active = true
    groupSplitApi.get(id)
      .then((result) => { if (active) applyResult(result) })
      .catch((error) => { if (active) setLoadError(error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, applyResult])

  const selectedParticipants = useMemo(
    () => data?.participants.filter((person) => selectedIds.includes(person._id)) || [],
    [data, selectedIds]
  )
  const customTotal = selectedParticipants.reduce((sum, person) => sum + (Number(customAmounts[person._id]) || 0), 0)
  const scale = currencyScale(currency)
  const customAmountsValid = selectedParticipants.every((person) => {
    const share = Number(customAmounts[person._id])
    return Number.isFinite(share) && share > 0 && Math.abs(share * scale - Math.round(share * scale)) < 1e-6
  })
  const customSharesMatch = customAmountsValid &&
    Math.round(customTotal * scale) === Math.round((Number(amount) || 0) * scale)
  const equalDrafts = equalSharesFor(amount, currency, selectedParticipants.map((person) => person._id))

  const addExpense = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setActionError(null)
    try {
      const payload = {
        description,
        amount: Number(amount),
        currency,
        splitMode,
      }
      if (splitMode === 'equal') {
        payload.participantIds = selectedParticipants.map((person) => person._id)
      } else {
        payload.shares = selectedParticipants.map((person) => ({
          userId: person._id,
          amount: Number(customAmounts[person._id]),
        }))
      }
      const { expense } = await groupSplitApi.create(id, payload)
      setData((current) => ({ ...current, expenses: [expense, ...current.expenses] }))
      setDescription('')
      setAmount('')
      setSplitMode('equal')
      setCustomAmounts({})
      setSelectedIds(data.participants.map((person) => person._id))
    } catch (error) {
      setActionError(error)
    } finally {
      setSaving(false)
    }
  }

  const updatePaid = async (expense, share) => {
    setActionError(null)
    try {
      const { expense: updated } = await groupSplitApi.setPaid(
        id,
        expense._id,
        share.user._id,
        !share.paid
      )
      setData((current) => ({
        ...current,
        expenses: current.expenses.map((item) => item._id === updated._id ? updated : item),
      }))
    } catch (error) {
      setActionError(error)
    }
  }

  const removeExpense = async (expenseId) => {
    setActionError(null)
    try {
      await groupSplitApi.remove(id, expenseId)
      setData((current) => ({
        ...current,
        expenses: current.expenses.filter((item) => item._id !== expenseId),
      }))
      setConfirmDelete('')
    } catch (error) {
      setActionError(error)
    }
  }

  const changeSplitMode = (mode) => {
    if (mode === 'custom') {
      setCustomAmounts((current) => ({ ...equalDrafts, ...current }))
    }
    setSplitMode(mode)
  }

  const toggleParticipant = (personId) => {
    setSelectedIds((current) => (
      current.includes(personId) ? current.filter((idValue) => idValue !== personId) : [...current, personId]
    ))
  }

  if (loading) return <Spinner label="Loading group costs…" />
  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ErrorBox error={loadError} />
        <button type="button" onClick={load} className="btn-secondary mt-4">{t('Try again')}</button>
      </div>
    )
  }
  if (!data || String(data.trip._id) !== id) return <Spinner label="Loading group costs…" />

  const canEditShare = (share) =>
    data.isOwner || String(share.user?._id) === String(user?._id)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to={`/chat?trip=${id}`} className="mb-5 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
        <ArrowLeft size={14} /> {t('Back to group chat')}
      </Link>
      <PageHeader eyebrow="Travel together" title="Split group costs">
        {data.trip.title || data.trip.destination?.name || t('Trip')} · {t('record each traveler’s share and keep track of who has paid.')}
      </PageHeader>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Wallet size={18} className="mt-0.5 shrink-0" />
        <p><strong>{t('Tracking only:')}</strong> {t('this does not charge anyone or confirm bookings. Travelers update their own paid status; the trip owner can update any share.')}</p>
      </div>

      <ErrorBox error={actionError} className="mb-4" />

      <section className="card mb-8 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">{t('Add a shared cost')}</h2>
        <p className="mt-1 text-sm text-stone">{t('Split a booking or group expense equally, or enter custom shares.')}</p>
        <form onSubmit={addExpense} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_120px]">
            <label className="block">
              <span className="label">{t('What is it?')}</span>
              <input
                className="input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={120}
                placeholder={t('Hotel booking')}
                required
              />
            </label>
            <label className="block">
              <span className="label">{t('Total amount')}</span>
              <input
                className="input"
                type="number"
                min={currency === 'JPY' ? 1 : 0.01}
                step={currency === 'JPY' ? 1 : 0.01}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label className="block">
              <span className="label">{t('Currency')}</span>
              <select className="input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
          </div>

          <div>
            <span className="label">{t('How should it be split?')}</span>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => changeSplitMode('equal')} className={clsx('btn-secondary', splitMode === 'equal' && '!border-ink !bg-ink !text-paper')}>{t('Equal split')}</button>
              <button type="button" onClick={() => changeSplitMode('custom')} className={clsx('btn-secondary', splitMode === 'custom' && '!border-ink !bg-ink !text-paper')}>{t('Custom shares')}</button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {data.participants.map((person) => {
              const isSelected = selectedIds.includes(person._id)
              const shareAmount = splitMode === 'equal'
                ? equalDrafts[person._id]
                : customAmounts[person._id]
              return (
                <div key={person._id} className="flex items-center gap-3 rounded-xl border border-sand/70 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleParticipant(person._id)}
                    aria-label={t('Include {name} in this split', { name: person.name || t('Traveler') })}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {person.name || t('Traveler')}{String(person._id) === String(user?._id) ? ` ${t('(you)')}` : ''}
                  </span>
                  {isSelected && (
                    splitMode === 'custom' ? (
                      <input
                        type="number"
                        min={currency === 'JPY' ? 1 : 0.01}
                        step={currency === 'JPY' ? 1 : 0.01}
                        className="input !w-28 !py-1.5 text-right"
                        value={customAmounts[person._id] ?? ''}
                        onChange={(event) => setCustomAmounts((current) => ({ ...current, [person._id]: event.target.value }))}
                        aria-label={t('{name} share', { name: person.name || t('Traveler') })}
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="text-sm tabular-nums text-soot">
                        {shareAmount === undefined ? '—' : formatAmount(shareAmount, currency, locale)}
                      </span>
                    )
                  )}
                </div>
              )
            })}
          </div>

          {splitMode === 'custom' && (
            <p className={clsx('text-xs', customSharesMatch ? 'text-moss-700' : 'text-clay-700')}>
              {t('Shares total {total} of {amount}.', { total: formatAmount(customTotal, currency, locale), amount: formatAmount(Number(amount) || 0, currency, locale) })}
              {!customSharesMatch && ` ${t('Adjust the shares so they equal the group cost.')}`}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !description.trim() || !selectedParticipants.length || (splitMode === 'custom' && !customSharesMatch)}
            className="btn-primary"
          >
            <Plus size={15} /> {saving ? t('Saving…') : t('Add split')}
          </button>
        </form>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{t('Group costs')}</h2>
        <span className="flex items-center gap-1.5 text-sm text-stone"><Users size={15} /> {t('{count} group members', { count: data.participants.length })}</span>
      </div>

      {data.expenses.length === 0 ? (
        <Empty title="No shared costs yet" illustration="🧾">
          {t('Add a booking or group expense to give everyone a clear share and payment status.')}
        </Empty>
      ) : (
        <div className="space-y-4">
          {data.expenses.map((expense) => {
            const paidTotal = expense.shares.filter((share) => share.paid).reduce((sum, share) => sum + share.amount, 0)
            const canRemove =
              data.isOwner || String(expense.createdBy?._id) === String(user?._id)
            return (
              <article key={expense._id} className="card overflow-hidden">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-sand/70 px-4 py-4 sm:px-5">
                  <div>
                    <h3 className="font-semibold">{expense.description}</h3>
                    <p className="mt-1 text-xs text-stone">
                      {t('Added by {name}', { name: expense.createdBy?.name || t('Traveler') })} · {t(expense.splitMode === 'equal' ? 'equal split' : 'custom shares')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="font-display text-xl font-semibold tabular-nums">{formatAmount(expense.amount, expense.currency, locale)}</p>
                      <p className="text-xs text-stone">{t('{amount} paid', { amount: formatAmount(paidTotal, expense.currency, locale) })}</p>
                    </div>
                    {canRemove && (
                      confirmDelete === expense._id ? (
                        <div className="flex items-center gap-1 text-xs">
                          <button type="button" onClick={() => removeExpense(expense._id)} className="font-semibold text-clay-700">{t('Remove')}</button>
                          <button type="button" onClick={() => setConfirmDelete('')} className="text-stone">{t('Cancel')}</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(expense._id)} className="btn-ghost !p-1.5 text-stone" aria-label={t('Remove {name}', { name: expense.description })}>
                          <Trash2 size={15} />
                        </button>
                      )
                    )}
                  </div>
                </header>
                <ul className="divide-y divide-sand/50 px-4 sm:px-5">
                  {expense.shares.map((share) => {
                    const ownShare = String(share.user?._id) === String(user?._id)
                    return (
                      <li key={share.user?._id} className="flex items-center gap-3 py-3">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {share.user?.name || t('Traveler')}{ownShare ? ` ${t('(you)')}` : ''}
                        </span>
                        <span className="text-sm font-medium tabular-nums">{formatAmount(share.amount, expense.currency, locale)}</span>
                        {canEditShare(share) ? (
                          <button
                            type="button"
                            onClick={() => updatePaid(expense, share)}
                            className={clsx(
                              'inline-flex min-w-24 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                              share.paid ? 'bg-moss-100 text-moss-700' : 'bg-cream text-stone hover:bg-sand/60'
                            )}
                          >
                            {share.paid && <Check size={12} />}
                            {share.paid ? t('Paid') : t('Mark paid')}
                          </button>
                        ) : (
                          <span className={clsx('min-w-24 text-center text-xs', share.paid ? 'text-moss-700' : 'text-stone')}>
                            {share.paid ? t('Paid') : t('Unpaid')}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
