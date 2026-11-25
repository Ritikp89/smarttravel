import { useState } from 'react'
import { MessageSquare, Send, Star, X } from 'lucide-react'
import clsx from 'clsx'
import { feedbackApi } from '../services/api'
import { useAuth } from '../context/authContext'
import { useLanguage } from '../context/LanguageContext'

export default function Feedback() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!message.trim()) {
      setError('Please enter your feedback')
      return
    }

    setBusy(true)
    setError('')
    try {
      await feedbackApi.submit({
        name: user?.name,
        email: user?.email,
        category,
        rating: rating || undefined,
        message: message.trim(),
      })
      setSent(true)
      setMessage('')
      setRating(0)
    } catch (err) {
      setError(err.message || 'Could not send feedback')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open ? (
        <section className="w-[calc(100vw-2.5rem)] max-w-[350px] rounded-2xl border border-sand bg-paper shadow-lift">
          <header className="flex items-center justify-between border-b border-sand/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{t('Share feedback')}</p>
              <p className="text-xs text-stone">{t('Tell us how we can improve')}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !p-1.5" aria-label={t('Close feedback')}>
              <X size={16} />
            </button>
          </header>

          {sent ? (
            <div className="p-5 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-moss-100 text-moss-700">✓</div>
              <p className="mt-3 font-semibold">{t('Thanks for helping improve Smart Travel')}</p>
              <button type="button" onClick={() => { setSent(false); setOpen(false) }} className="btn-secondary mt-4">
                {t('Done')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3 p-4">
              <div>
                <label className="label" htmlFor="feedback-category">{t('Topic')}</label>
                <select id="feedback-category" className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="general">{t('General')}</option>
                  <option value="destination">{t('Destination')}</option>
                  <option value="trip">{t('Trip planning')}</option>
                  <option value="booking">{t('Flights and hotels')}</option>
                  <option value="bug">{t('Problem or bug')}</option>
                </select>
              </div>

              <div>
                <p className="label">{t('Rating')}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setRating(value)}
                      className={clsx('grid h-9 w-9 place-items-center rounded-lg border transition', rating >= value ? 'border-butter bg-butter/40 text-ink' : 'border-sand text-stone hover:border-ink/30')}
                      aria-label={t(value > 1 ? '{count} stars' : '{count} star', { count: value })}
                    >
                      <Star size={16} className={rating >= value ? 'fill-butter' : ''} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" htmlFor="feedback-message">{t('Message')}</label>
                <textarea
                  id="feedback-message"
                  className="input min-h-28 resize-y"
                  value={message}
                  maxLength={2000}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t('What worked well or what should we improve?')}
                />
              </div>

              {error && <p className="text-xs text-clay-600">{t(error)}</p>}

              <button type="submit" disabled={busy} className="btn-primary w-full">
                <Send size={15} /> {busy ? t('Sending…') : t('Send feedback')}
              </button>
            </form>
          )}
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-12 items-center gap-2 rounded-full border border-sand bg-white px-4 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5" aria-label={t('Open feedback form')}>
          <MessageSquare size={17} /> {t('Feedback')}
        </button>
      )}
    </div>
  )
}
