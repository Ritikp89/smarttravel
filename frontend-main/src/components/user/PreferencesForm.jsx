import { useState } from 'react'
import clsx from 'clsx'
import { BUDGET_LABEL, ErrorBox, INTERESTS, PACE_LABEL } from '../ui'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR']

export default function PreferencesForm({ user, onSave }) {
  const [prefs, setPrefs] = useState({
    interests: user.preferences?.interests || [],
    budgetLevel: user.preferences?.budgetLevel || 'mid',
    travelPace: user.preferences?.travelPace || 'balanced',
    homeCity: user.preferences?.homeCity || '',
    currency: user.preferences?.currency || 'USD',
  })
  const [state, setState] = useState({})

  const set = (patch) => setPrefs((p) => ({ ...p, ...patch }))
  const toggle = (i) => set({ interests: prefs.interests.includes(i) ? prefs.interests.filter((x) => x !== i) : [...prefs.interests, i] })

  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true })
    try {
      await onSave({ preferences: prefs })
      setState({ ok: true })
      setTimeout(() => setState({}), 2500)
    } catch (err) {
      setState({ error: err.message })
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Travel preferences</h2>
      <ErrorBox error={state.error} className="mt-3" />

      <div className="mt-5 space-y-6">
        <div>
          <p className="label">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button type="button" key={i} onClick={() => toggle(i)} className={prefs.interests.includes(i) ? 'chip-on' : 'chip-idle'}>{i}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label">Budget style</p>
            <Segmented options={BUDGET_LABEL} value={prefs.budgetLevel} onChange={(v) => set({ budgetLevel: v })} />
          </div>
          <div>
            <p className="label">Usual pace</p>
            <Segmented options={PACE_LABEL} value={prefs.travelPace} onChange={(v) => set({ travelPace: v })} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="homeCity">Home city <span className="font-normal text-stone">(optional)</span></label>
            <input id="homeCity" className="input" value={prefs.homeCity} onChange={(e) => set({ homeCity: e.target.value })} placeholder="Where you fly from" />
          </div>
          <div>
            <label className="label" htmlFor="currency">Currency for budgets</label>
            <select id="currency" className="input" value={prefs.currency} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="mt-1 text-xs text-stone">Labels only for now - amounts are estimated in USD.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {state.ok && <span className="text-sm text-moss-600">Saved.</span>}
        <button type="submit" disabled={state.busy} className="btn-primary">{state.busy ? 'Saving…' : 'Save preferences'}</button>
      </div>
    </form>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream p-1">
      {Object.entries(options).map(([key, label]) => (
        <button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          className={clsx('rounded-lg px-2 py-1.5 text-xs font-medium transition', value === key ? 'bg-white text-ink shadow-soft' : 'text-soot hover:text-ink')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
