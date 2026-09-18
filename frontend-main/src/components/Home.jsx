import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarRange, Coins, Sparkles } from 'lucide-react'
import { destinationApi } from '../services/api'
import { useAuth } from '../context/authContext'
import DestinationCard from './explore/DestinationCard'

const steps = [
  {
    icon: Sparkles,
    title: 'Tell us how you travel',
    body: "Food person? Museum person? Beach-and-a-book person? Pick a few interests and a budget style. That's it.",
  },
  {
    icon: CalendarRange,
    title: 'Get a real day-by-day plan',
    body: 'We pack each day sensibly - mornings for the big sights, lunch where locals eat, nothing that needs you in two places at once.',
  },
  {
    icon: Coins,
    title: 'Know what it costs before you go',
    body: 'A budget broken down by beds, meals, tickets and getting around, with honest estimates you can overwrite.',
  },
]

export default function Home() {
  const { isAuthed } = useAuth()
  const [picks, setPicks] = useState([])

  useEffect(() => {
    destinationApi
      .recommended({ limit: 3 })
      .then((d) => setPicks(d.destinations))
      .catch(() => {})
  }, [])

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-24">
        <div className="max-w-3xl">
          <p className="eyebrow mb-4">Trip planning, minus the twelve open tabs</p>
          <h1 className="text-5xl font-medium leading-[1.05] sm:text-7xl">
            Plan a trip that <em className="font-light italic text-clay-500">actually</em> fits you.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-soot">
            Smart Travel builds day-by-day itineraries and realistic budgets around the way you like to travel -
            not around whatever is trending this month.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={isAuthed ? '/trips/new' : '/register'} className="btn-primary !px-6 !py-3 !text-base">
              Start planning <ArrowRight size={18} />
            </Link>
            <Link to="/explore" className="btn-secondary !px-6 !py-3 !text-base">
              Browse destinations
            </Link>
          </div>
          <p className="mt-4 text-xs text-stone">
            Want to poke around first? Log in as <code className="rounded bg-cream px-1">maya@example.com</code> /{' '}
            <code className="rounded bg-cream px-1">password123</code>
          </p>
        </div>
      </section>

      <section className="border-y border-sand/60 bg-cream/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="relative">
              <span className="absolute -top-3 left-0 font-display text-6xl font-light text-sand">{i + 1}</span>
              <div className="relative pl-1 pt-6">
                <Icon size={22} className="text-clay-500" />
                <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-soot">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {picks.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-1">Good right now</p>
              <h2 className="text-3xl font-semibold">Places worth going this month</h2>
            </div>
            <Link to="/explore" className="hidden text-sm text-soot underline-offset-4 hover:underline sm:inline">
              See all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((d) => (
              <DestinationCard key={d._id} destination={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
