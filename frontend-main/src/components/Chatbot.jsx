import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { destinationApi, tripApi } from '../services/api'
import { useAuth } from '../context/authContext'

const STARTERS = ['Where should I travel?', 'Show my upcoming trips', 'Find a beach destination', 'Plan a budget trip']

export default function Chatbot() {
  const { isAuthed } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! Ask me about destinations, trip ideas, budgets, or your saved trips.' },
  ])
  const endRef = useRef(null)

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

      if (isAuthed && /(my trip|my trips|upcoming|planned trip)/.test(lower)) {
        const trips = await tripApi.list()
        if (!trips.length) {
          addMessage({ role: 'assistant', text: 'You have no trips yet.', action: { to: '/trips/new', label: 'Plan your first trip' } })
        } else {
          addMessage({
            role: 'assistant',
            text: `You have ${trips.length} trip${trips.length === 1 ? '' : 's'}. ${trips.slice(0, 3).map((trip) => `${trip.title || trip.destination?.name} — ${trip.destination?.name || 'Custom place'}`).join('; ')}.`,
            action: { to: '/trips', label: 'View my trips' },
          })
        }
      } else if (/(budget|cheap|affordable|low cost)/.test(lower)) {
        const { destinations } = await destinationApi.list({ sort: 'cheapest', limit: 5, budgetLevel: 'budget' })
        addMessage({
          role: 'assistant',
          text: `Here are affordable ideas: ${destinations.map((d) => `${d.name}, ${d.country}`).join('; ')}.`,
          action: { to: '/explore?sort=cheapest', label: 'Explore budget destinations' },
        })
      } else {
        let search = ''
        for (const word of ['beach', 'food', 'culture', 'nature', 'temples', 'nightlife', 'adventure', 'art', 'history', 'wellness', 'wine']) {
          if (lower.includes(word)) {
            search = word
            break
          }
        }
        const { destinations } = await destinationApi.list(search ? { q: search, limit: 5 } : { sort: 'popular', limit: 5 })
        if (!destinations.length) {
          addMessage({ role: 'assistant', text: 'I could not find a matching destination. Try a city, country, or interest like beach or food.' })
        } else {
          addMessage({
            role: 'assistant',
            text: `You might like ${destinations.slice(0, 5).map((d) => `${d.name}, ${d.country}`).join('; ')}.`,
            action: { to: search ? `/explore?q=${encodeURIComponent(search)}` : '/explore', label: 'Browse destinations' },
          })
        }
      }
    } catch (error) {
      addMessage({ role: 'assistant', text: error.message || 'I could not complete that query. Please try again.' })
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
                <p className="text-sm font-semibold">Smart Travel Assistant</p>
                <p className="text-[11px] text-paper/70">{busy ? 'Finding an answer…' : 'Ready to help'}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMessages([messages[0]])}
                className="grid h-8 w-8 place-items-center rounded-full text-paper/80 hover:bg-white/10"
                aria-label="Clear chat"
              >
                <Trash2 size={15} />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-paper/80 hover:bg-white/10" aria-label="Close chat">
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
                  {message.text}
                </div>
                {message.action && (
                  <Link to={message.action.to} onClick={() => setOpen(false)} className="mt-2 inline-block text-xs font-semibold text-clay-600 hover:underline">
                    {message.action.label} →
                  </Link>
                )}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button key={starter} type="button" onClick={() => answer(starter)} className="chip-idle" disabled={busy}>
                    {starter}
                  </button>
                ))}
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
              placeholder="Ask a travel question…"
              disabled={busy}
              aria-label="Chat message"
            />
            <button type="submit" className="btn-primary !px-3" disabled={busy || !input.trim()} aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-14 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper shadow-lift transition hover:-translate-y-0.5" aria-label="Open travel assistant">
          <Bot size={20} /> <span className="hidden sm:inline">Ask Smart Travel</span>
        </button>
      )}
    </div>
  )
}
