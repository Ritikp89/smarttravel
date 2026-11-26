import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi, tripApi } from '../services/api'
import { useAuth } from '../context/authContext'
import { useLanguage } from '../context/LanguageContext'
import { FAQ_SECTIONS, findTravelFaq } from './travelFaq'

const STARTERS = ['Where should I travel?', 'Show my upcoming trips', 'Find a beach destination', 'Plan a budget trip']

export default function Chatbot() {
  const { isAuthed } = useAuth()
  const { language, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: t('Hi! Ask me about destinations, trip ideas, budgets, or your saved trips.') },
  ])
  const endRef = useRef(null)

  useEffect(() => {
    setMessages((current) => current.length === 1 && current[0].role === 'assistant'
      ? [{ ...current[0], text: t('Hi! Ask me about destinations, trip ideas, budgets, or your saved trips.') }]
      : current)
  }, [language, t])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const addMessage = (message) => setMessages((current) => [...current, message])

  const answer = async (query) => {
    const text = query.trim()
    if (!text || busy) return

    addMessage({ role: 'user', text })
    setInput('')
    setBusy(true)

    try {
      const lower = text.toLowerCase()
      const faq = findTravelFaq(text)
      if (faq) {
        addMessage({ role: 'assistant', text: faq.answer, action: faq.action })
        return
      }

      if (isAuthed && /(my trip|my trips|upcoming|planned trip|मेरी यात्र|आने वाली यात्र)/.test(lower)) {
        const trips = await tripApi.list()
        if (!trips.length) {
          addMessage({ role: 'assistant', text: t('You have no trips yet.'), action: { to: '/trips/new', label: t('Plan your first trip') } })
        } else {
          addMessage({
            role: 'assistant',
            text: t(trips.length === 1 ? 'You have {count} trip: {trips}.' : 'You have {count} trips: {trips}.', {
              count: trips.length,
              trips: trips.slice(0, 3).map((trip) => `${trip.title || trip.destination?.name} — ${trip.destination?.name || t('Custom place')}`).join('; '),
            }),
            action: { to: '/trips', label: t('View my trips') },
          })
        }
      } else if (/(budget|cheap|affordable|low cost|बजट|सस्ता|कम खर्च)/.test(lower)) {
        const { destinations } = await destinationApi.list({ sort: 'cheapest', limit: 5, budgetLevel: 'budget' })
        addMessage({
          role: 'assistant',
          text: t('Here are affordable ideas: {destinations}.', { destinations: destinations.map((d) => `${d.name}, ${d.country}`).join('; ') }),
          action: { to: '/explore?sort=cheapest', label: t('Explore budget destinations') },
        })
      } else {
        let search = ''
        const searchTerms = [
          ['beach', ['beach', 'समुद्र तट', 'समुद्र']],
          ['food', ['food', 'खाना', 'भोजन']],
          ['culture', ['culture', 'संस्कृति']],
          ['nature', ['nature', 'प्रकृति']],
          ['temples', ['temples', 'मंदिर']],
          ['nightlife', ['nightlife', 'रात्रि जीवन']],
          ['adventure', ['adventure', 'रोमांच']],
          ['art', ['art', 'कला']],
          ['history', ['history', 'इतिहास']],
          ['wellness', ['wellness', 'स्वास्थ्य']],
          ['wine', ['wine', 'वाइन']],
        ]
        for (const [term, aliases] of searchTerms) {
          if (aliases.some((word) => lower.includes(word))) {
            search = term
            break
          }
        }
        const { destinations } = await destinationApi.list(search ? { q: search, limit: 5 } : { sort: 'popular', limit: 5 })
        if (!destinations.length) {
          addMessage({ role: 'assistant', text: t('I could not find a matching destination. Try a city, country, or interest like beach or food.') })
        } else {
          addMessage({
            role: 'assistant',
            text: t('You might like {destinations}.', { destinations: destinations.slice(0, 5).map((d) => `${d.name}, ${d.country}`).join('; ') }),
            action: { to: search ? `/explore?q=${encodeURIComponent(search)}` : '/explore', label: t('Browse destinations') },
          })
        }
      }
    } catch (error) {
      addMessage({ role: 'assistant', text: t(error.message || 'I could not complete that query. Please try again.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section className="flex h-[520px] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-sand bg-paper shadow-lift">
          <header className="flex items-center justify-between border-b border-sand/70 bg-ink px-4 py-3 text-paper">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-clay-500"><Bot size={17} /></span>
              <div>
                <p className="text-sm font-semibold">{t('Smart Travel Assistant')}</p>
                <p className="text-[11px] text-paper/70">{busy ? t('Finding an answer…') : t('Ready to help')}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMessages([{ role: 'assistant', text: t('Hi! Ask me about destinations, trip ideas, budgets, or your saved trips.') }])}
                className="grid h-8 w-8 place-items-center rounded-full text-paper/80 hover:bg-white/10"
                aria-label={t('Clear chat')}
              >
                <Trash2 size={15} />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-paper/80 hover:bg-white/10" aria-label={t('Close chat')}>
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={clsx('max-w-[88%]', message.role === 'user' ? 'ml-auto' : 'mr-auto')}>
                <div className={clsx(
                  'rounded-2xl px-3.5 py-2.5 text-sm',
                  message.role === 'user' ? 'rounded-br-md bg-ink text-paper' : 'rounded-bl-md border border-sand bg-white/80 text-ink'
                )}>
                  {message.role === 'assistant' ? t(message.text) : message.text}
                </div>
                {message.action && (
                  <Link to={message.action.to} onClick={() => setOpen(false)} className="mt-2 inline-block text-xs font-semibold text-clay-600 hover:underline">
                    {t(message.action.label)} →
                  </Link>
                )}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((starter) => (
                    <button key={starter} type="button" onClick={() => answer(t(starter))} className="chip-idle" disabled={busy}>
                      {t(starter)}
                    </button>
                  ))}
                </div>
                <p className="eyebrow">{t('Common travel questions')}</p>
                <div className="space-y-2">
                  {FAQ_SECTIONS.map((section) => (
                    <details key={section.title} className="rounded-xl border border-sand bg-white/60">
                      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-ink">
                        {t(section.title)} <span className="ml-1 text-stone">({section.questions.length})</span>
                      </summary>
                      <div className="space-y-1 border-t border-sand/70 p-2">
                        {section.questions.map((item) => (
                          <button
                            key={item.question}
                            type="button"
                            onClick={() => answer(t(item.question))}
                            disabled={busy}
                            className="block w-full rounded-lg px-2.5 py-2 text-left text-xs leading-relaxed text-soot hover:bg-cream hover:text-ink disabled:opacity-50"
                          >
                            {t(item.question)}
                          </button>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              answer(input)
            }}
            className="flex gap-2 border-t border-sand/70 p-3"
          >
            <input
              className="input !py-2"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('Ask a travel question…')}
              disabled={busy}
              aria-label={t('Chat message')}
            />
            <button type="submit" className="btn-primary !px-3" disabled={busy || !input.trim()} aria-label={t('Send message')}>
              <Send size={16} />
            </button>
          </form>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-14 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper shadow-lift transition hover:-translate-y-0.5" aria-label={t('Open travel assistant')}>
          <Bot size={20} /> <span className="hidden sm:inline">{t('Ask Smart Travel')}</span>
        </button>
      )}
    </div>
  )
}
