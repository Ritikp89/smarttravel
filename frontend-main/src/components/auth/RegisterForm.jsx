import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../../context/authContext'
import AuthLayout from './AuthLayout'
import { ErrorBox, INTERESTS, BUDGET_LABEL } from '../ui'

export default function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [interests, setInterests] = useState([])
  const [budgetLevel, setBudgetLevel] = useState('mid')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const toggleInterest = (i) =>
    setInterests((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]))

  const next = (e) => {
    e.preventDefault()
    if (form.password.length < 6) {
      setError('Password needs at least 6 characters')
      return
    }
    setError(null)
    setStep(2)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register({ ...form, email: form.email.trim(), preferences: { interests, budgetLevel } })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      if (err.status === 409) setStep(1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={step === 1 ? 'Create your account' : 'How do you like to travel?'}
      subtitle={step === 1 ? 'Takes about a minute. No credit card, obviously.' : 'This shapes your recommendations. You can change it anytime.'}
      footer={
        step === 1 && (
          <>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-ink underline underline-offset-4">Log in</Link>
          </>
        )
      }
    >
      <div className="mb-6 flex items-center gap-2 text-xs text-stone">
        <span className={clsx('h-1.5 flex-1 rounded-full', 'bg-ink')} />
        <span className={clsx('h-1.5 flex-1 rounded-full', step === 2 ? 'bg-ink' : 'bg-sand')} />
        <span className="ml-1">{step}/2</span>
      </div>

      {step === 1 ? (
        <form onSubmit={next} className="space-y-4">
          <ErrorBox error={error} />
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" name="name" required maxLength={60} className="input" placeholder="What should we call you?" value={form.name} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" value={form.email} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} className="input" placeholder="At least 6 characters" value={form.password} onChange={onChange} />
          </div>
          <button type="submit" className="btn-primary w-full !py-2.5">Continue</button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <ErrorBox error={error} />
          <div>
            <p className="label">I'm into…</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button type="button" key={i} onClick={() => toggleInterest(i)} className={interests.includes(i) ? 'chip-on' : 'chip-idle'}>
                  {i}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone">Pick as many as you like. Three or four works best.</p>
          </div>

          <div>
            <p className="label">Budget style</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(BUDGET_LABEL).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setBudgetLevel(key)}
                  className={clsx(
                    'rounded-xl border px-3 py-2.5 text-sm transition',
                    budgetLevel === key ? 'border-ink bg-ink text-paper' : 'border-sand bg-white/60 hover:border-ink/40'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 !py-2.5">
              {busy ? 'Creating…' : 'Finish up'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
