import { Link } from 'react-router-dom'
import { Heart, Share2, Star, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/authContext'
import { money } from '../ui'
import { getDestinationFallback, getDestinationImage } from '../../services/travelImages'
import { convertCurrency, normalizeCurrency } from '../../services/currency'

export default function DestinationCard({ destination: d, budgetLevel, onDelete }) {
  const { isAuthed, isSaved, toggleSaved, user } = useAuth()
  const level = budgetLevel || user?.preferences?.budgetLevel || 'mid'
  const saved = isSaved(d._id)
  const match = d.recommendation?.score
  const coverImage = getDestinationImage(d)
  const currency = normalizeCurrency(user?.preferences?.currency)
  const ownerId = d.createdBy?._id || d.createdBy
  const canDelete = isAuthed && ownerId && String(ownerId) === String(user?._id)

  const onSave = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleSaved(d._id)
    } catch {
      // ignore; it's a heart button
    }
  }

  const onShare = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    const url = `${window.location.origin}/explore/${d.slug}`
    const shareData = {
      title: `${d.name}, ${d.country}`,
      text: d.tagline || `Explore ${d.name}, ${d.country}`,
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(url)
        window.alert('Destination link copied')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') window.alert('Could not share this destination')
    }
  }

  return (
    <Link to={`/explore/${d.slug}`} className="card group block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        <img
          src={coverImage}
          alt={d.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = getDestinationFallback(d)
          }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-paper">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">{d.country}</p>
            <h3 className="font-display text-2xl font-semibold leading-tight">{d.name}</h3>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-paper/20 px-2 py-0.5 text-xs backdrop-blur">
            <Star size={12} className="fill-butter text-butter" /> {d.rating?.toFixed(1)}
          </span>
        </div>
        {isAuthed && (
          <div className="absolute right-3 top-3 flex gap-1.5">
            <button
              type="button"
              onClick={onShare}
              aria-label={`Share ${d.name}`}
              title="Share destination"
              className="grid h-8 w-8 place-items-center rounded-full bg-paper/70 text-ink backdrop-blur transition hover:bg-paper"
            >
              <Share2 size={15} />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (window.confirm(`Delete ${d.name} and its trips?`)) onDelete?.(d)
                }}
                aria-label={`Delete ${d.name}`}
                title="Delete destination"
                className="grid h-8 w-8 place-items-center rounded-full bg-clay-600 text-paper backdrop-blur transition hover:bg-clay-700"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onSave}
              aria-label={saved ? 'Remove from saved' : 'Save destination'}
              className={clsx(
                'grid h-8 w-8 place-items-center rounded-full backdrop-blur transition',
                saved ? 'bg-clay-500 text-paper' : 'bg-paper/70 text-ink hover:bg-paper'
              )}
            >
              <Heart size={15} className={saved ? 'fill-current' : ''} />
            </button>
          </div>
        )}
        {match != null && (
          <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-semibold text-ink">
            {match}% match
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm text-soot">{d.tagline}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex flex-wrap gap-1">
            {d.tags?.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-cream px-2 py-0.5 text-soot">{t}</span>
            ))}
          </div>
          <span className="shrink-0 text-stone">
            ~{money(convertCurrency(d.dailyCost?.[level], currency), currency)}<span className="opacity-70">/day</span>
          </span>
        </div>
        {d.recommendation?.reasons?.[0] && (
          <p className="mt-3 text-xs italic text-moss-600">{d.recommendation.reasons[0]}</p>
        )}
      </div>
    </Link>
  )
}
