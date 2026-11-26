import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, PiggyBank, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import { savingsPlanApi } from '../../services/api'
import { Empty, ErrorBox, formatDate, PageHeader, Spinner } from '../ui'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR']

const formatAmount = (amount, currency, locale) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  maximumFractionDigits: currency === 'JPY' ? 0 : 2,
}).format(amount)

const FREQUENCIES = [
  ['weekly', 'Weekly'],
  ['biweekly', 'Every two weeks'],
  ['monthly', 'Monthly'],
]

const STATUS_STYLE = {
  paid: 'bg-moss-100 text-moss-700',
  due: 'bg-butter/50 text-soot',
  overdue: 'bg-clay-100 text-clay-700',
  upcoming: 'bg-cream text-stone',
}

export default function SavingsPlan() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t, locale } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [currency, setCurrency] = useState(user?.preferences?.currency || 'INR')
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionNote, setContributionNote] = useState('')
  const [contributorId, setContributorId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDeleteContribution, setConfirmDeleteContribution] = useState('')

  const applyResult = useCallback((result) => {
    setData(result)
    setCurrency(result.currency || 'INR')
    setTargetAmount((current) => current || (result.targetSuggestion ? String(result.targetSuggestion) : ''))
    setDepositAmount((current) => {
      if (current || !result.targetSuggestion) return current
      const scale = result.currency === 'JPY' ? 1 : 100
      return String(Math.max(1, Math.round(result.targetSuggestion * scale * 0.1)) / scale)
    })
    setContributorId((current) => current || String(user?._id || ''))
    setLoadError(null)
    setLoading(false)
  }, [user?._id])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      applyResult(await savingsPlanApi.get(id))
    } catch (error) {
      setLoadError(error)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [id, applyResult])

  useEffect(() => {
    let active = true
    savingsPlanApi.get(id)
      .then((result) => { if (active) applyResult(result) })
      .catch((error) => { if (active) setLoadError(error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, applyResult])

  const createPlan = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setActionError(null)
    try {
      const result = await savingsPlanApi.create(id, {
        targetAmount: Number(targetAmount),
        depositAmount: Number(depositAmount),
        currency,
        frequency,
      })
      setData((current) => ({ ...current, ...result }))
    } catch (error) {
      setActionError(error)
    } finally {
      setSaving(false)
    }
  }

  const addContribution = async (event) => {
    event.preventDefault()
    if (saving || !data?.plan) return
    setSaving(true)
    setActionError(null)
    try {
      const result = await savingsPlanApi.addContribution(id, {
        amount: Number(contributionAmount),
        note: contributionNote,
        ...(data.isOwner && contributorId ? { userId: contributorId } : {}),
      })
      setData((current) => ({ ...current, ...result }))
      setContributionAmount('')
      setContributionNote('')
    } catch (error) {
      setActionError(error)
    } finally {
      setSaving(false)
    }
  }

  const removeContribution = async (contributionId) => {
    setActionError(null)
    try {
      const result = await savingsPlanApi.removeContribution(id, contributionId)
      setData((current) => ({ ...current, ...result }))
      setConfirmDeleteContribution('')
    } catch (error) {
      setActionError(error)
    }
  }

  const removePlan = async () => {
    setActionError(null)
    try {
      await savingsPlanApi.remove(id)
      setData((current) => ({
        ...current,
        plan: null,
        schedule: [],
        contributedAmount: 0,
        remainingAmount: 0,
      }))
      setConfirmDelete(false)
    } catch (error) {
      setActionError(error)
    }
  }

  if (loading) return <Spinner label="Loading savings plan…" />
  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ErrorBox error={loadError} />
        <button type="button" onClick={load} className="btn-secondary mt-4">{t('Try again')}</button>
      </div>
    )
  }
  if (!data || String(data.trip._id) !== id) return <Spinner label="Loading savings plan…" />

  const currencyCode = data.plan?.currency || currency
  const progress = data.plan
    ? Math.min(100, (data.contributedAmount / data.plan.targetAmount) * 100)
    : 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to={`/chat?trip=${id}`} className="mb-5 inline-flex items-center gap-1 text-sm text-soot hover:text-ink">
        <ArrowLeft size={14} /> {t('Back to group chat')}
      </Link>
      <PageHeader eyebrow="Travel together" title="Travel layaway plan">
        {data.trip.title || data.trip.destination?.name || t('Trip')} · {t('plan contributions toward the trip before departure.')}
      </PageHeader>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <PiggyBank size={18} className="mt-0.5 shrink-0" />
        <p><strong>{t('Planning only:')}</strong> {t('no money is collected, no installments are charged automatically, and this does not lock or guarantee a booking price. Contributions are manually recorded.')}</p>
      </div>
      <ErrorBox error={actionError} className="mb-4" />

      {!data.plan ? (
        data.isOwner ? (
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">{t('Create a savings schedule')}</h2>
            <p className="mt-1 text-sm text-stone">{t('Set a target, an upfront deposit goal, and how often the group plans to contribute.')}</p>
            <form onSubmit={createPlan} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">{t('Trip savings target')}</span>
                  <input className="input" type="number" min={currency === 'JPY' ? 1 : 0.01} step={currency === 'JPY' ? 1 : 0.01} value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} required />
                  {data.targetSuggestion && <span className="mt-1 block text-xs text-stone">{t('Suggested from your trip budget: {amount}', { amount: formatAmount(data.targetSuggestion, currency, locale) })}</span>}
                </label>
                <label className="block">
                  <span className="label">{t('Deposit goal')}</span>
                  <input className="input" type="number" min={currency === 'JPY' ? 1 : 0.01} step={currency === 'JPY' ? 1 : 0.01} value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} required />
                </label>
                <label className="block">
                  <span className="label">{t('Installment frequency')}</span>
                  <select className="input" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                    {FREQUENCIES.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">{t('Currency')}</span>
                  <select className="input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                    {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={saving || !targetAmount || !depositAmount}>
                <CalendarClock size={15} /> {saving ? t('Creating…') : t('Create savings plan')}
              </button>
            </form>
          </section>
        ) : (
          <Empty title="No savings plan yet" illustration="🐷">
            {t('The trip owner can create a target and installment schedule for this group.')}
          </Empty>
        )
      ) : (
        <>
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-1">{t('Savings progress')}</p>
                <p className="font-display text-3xl font-semibold tabular-nums">
                  {formatAmount(data.contributedAmount, currencyCode, locale)}
                  <span className="text-lg font-normal text-stone"> / {formatAmount(data.plan.targetAmount, currencyCode, locale)}</span>
                </p>
                <p className="mt-1 text-sm text-stone">
                  {t('{amount} remaining · deposit goal {deposit} · {frequency}', {
                    amount: formatAmount(data.remainingAmount, currencyCode, locale),
                    deposit: formatAmount(data.plan.depositAmount, currencyCode, locale),
                    frequency: t(FREQUENCIES.find(([value]) => value === data.plan.frequency)?.[1] || ''),
                  })}
                </p>
              </div>
              {data.isOwner && (
                confirmDelete ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-clay-700">{t('Remove this plan?')}</span>
                    <button type="button" onClick={removePlan} className="font-semibold text-clay-700">{t('Yes')}</button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="text-stone">{t('No')}</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost !p-1.5 text-stone" aria-label={t('Remove savings plan')}>
                    <Trash2 size={16} />
                  </button>
                )
              )}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream">
              <div className="h-full rounded-full bg-moss-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-stone">{t('{percent}% recorded', { percent: Math.round(progress) })}</p>
          </section>

          <section className="card mt-5 p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">{t('Record a contribution')}</h2>
            <p className="mt-1 text-sm text-stone">{t('Contributions are manually entered and applied to the earliest due items first.')}</p>
            <form onSubmit={addContribution} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_1.5fr_auto]">
              <label className="block">
                <span className="label">{t('Amount ({currency})', { currency: currencyCode })}</span>
                <input className="input" type="number" min={currencyCode === 'JPY' ? 1 : 0.01} max={data.remainingAmount} step={currencyCode === 'JPY' ? 1 : 0.01} value={contributionAmount} onChange={(event) => setContributionAmount(event.target.value)} required />
              </label>
              {data.isOwner ? (
                <label className="block">
                  <span className="label">{t('Traveler')}</span>
                  <select className="input" value={contributorId} onChange={(event) => setContributorId(event.target.value)}>
                    {data.participants.map((person) => <option key={person._id} value={person._id}>{person.name || t('Traveler')}</option>)}
                  </select>
                </label>
              ) : (
                <div className="flex items-end pb-2 text-sm text-stone">{t('Recorded for you')}</div>
              )}
              <label className="block">
                <span className="label">{t('Note')} <span className="font-normal normal-case text-stone">{t('(optional)')}</span></span>
                <input className="input" value={contributionNote} onChange={(event) => setContributionNote(event.target.value)} maxLength={120} placeholder={t('First installment')} />
              </label>
              <button type="submit" className="btn-primary self-end" disabled={saving || !contributionAmount || Number(contributionAmount) > data.remainingAmount || data.remainingAmount <= 0}>
                <Plus size={15} /> {saving ? t('Saving…') : t('Record')}
              </button>
            </form>
            {data.remainingAmount <= 0 && <p className="mt-3 text-sm font-medium text-moss-700">{t('The trip savings target has been reached.')}</p>}
          </section>

          <section className="mt-7">
            <h2 className="mb-3 font-display text-2xl font-semibold">{t('Installment schedule')}</h2>
            <div className="card divide-y divide-sand/60">
              {data.schedule.map((item, index) => (
                <div key={`${item.type}-${index}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream text-ink">
                    {item.status === 'paid' ? <Check size={15} /> : <CalendarClock size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{item.type === 'deposit' ? t('Deposit') : t('Installment {number}', { number: index })}</p>
                    <p className="text-xs text-stone">{t('Due {date}', { date: formatDate(item.dueDate, 'PP', locale) })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatAmount(item.paidAmount, currencyCode, locale)} / {formatAmount(item.amount, currencyCode, locale)}</p>
                    {item.remainingAmount > 0 && <p className="text-xs text-stone">{t('{amount} remaining', { amount: formatAmount(item.remainingAmount, currencyCode, locale) })}</p>}
                  </div>
                  <span className={clsx('min-w-20 rounded-full px-2.5 py-1 text-center text-xs font-medium capitalize', STATUS_STYLE[item.status])}>
                    {t(item.status)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <h2 className="mb-3 font-display text-2xl font-semibold">{t('Contribution history')}</h2>
            {data.plan.contributions.length === 0 ? (
              <Empty title="No contributions recorded" illustration="🪙">
                {t('When someone contributes, record the amount here to update the schedule.')}
              </Empty>
            ) : (
              <div className="card divide-y divide-sand/60">
                {data.plan.contributions.map((contribution) => {
                  const canRemove =
                    data.isOwner || String(contribution.recordedBy?._id) === String(user?._id)
                  return (
                    <div key={contribution._id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {contribution.user?.name || t('Traveler')}
                          {contribution.recordedBy?._id !== contribution.user?._id && ` · ${t('recorded by {name}', { name: contribution.recordedBy?.name || t('trip owner') })}`}
                        </p>
                        <p className="text-xs text-stone">
                          {formatDate(contribution.contributedAt, 'PP p', locale)}
                          {contribution.note ? ` · ${contribution.note}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatAmount(contribution.amount, currencyCode, locale)}</span>
                      {canRemove && (
                        confirmDeleteContribution === contribution._id ? (
                          <div className="flex items-center gap-2 text-xs">
                            <button type="button" onClick={() => removeContribution(contribution._id)} className="font-semibold text-clay-700">{t('Remove')}</button>
                            <button type="button" onClick={() => setConfirmDeleteContribution('')} className="text-stone">{t('Cancel')}</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteContribution(contribution._id)} className="btn-ghost !p-1.5 text-stone" aria-label={t('Remove contribution')}>
                            <Trash2 size={14} />
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
