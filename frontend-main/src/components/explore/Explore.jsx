import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { destinationApi } from '../../services/api'
import { useAuth } from '../../context/authContext'
import DestinationCard from './DestinationCard'
import FilterBar from './FilterBar'
import { Empty, ErrorBox, PageHeader, Spinner } from '../ui'

export default function Explore() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tags, setTags] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const filters = useMemo(
    () => ({
      q: params.get('q') || '',
      region: params.get('region') || '',
      tag: params.get('tag') || '',
      sort: params.get('sort') || 'popular',
    }),
    [params]
  )

  const setFilters = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== 'popular'))
    setParams(clean, { replace: true })
  }

  useEffect(() => {
    destinationApi.tags().then(setTags).catch(() => {})
  }, [])

  // debounce the search box a touch so we're not hammering the API per keystroke
  useEffect(() => {
    setLoading(true)
    setError(null)
    const t = setTimeout(() => {
      destinationApi
        .list({ ...filters, budgetLevel: user?.preferences?.budgetLevel })
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false))
    }, filters.q ? 300 : 0)
    return () => clearTimeout(t)
  }, [filters, user?.preferences?.budgetLevel])

  const list = data?.destinations || []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Explore" title="Where to next?">
        {user?.preferences?.interests?.length
          ? `Match scores are based on your interest in ${user.preferences.interests.slice(0, 3).join(', ')}.`
          : 'Twelve places we know well, with honest costs and the stuff worth doing. Log in to see how each one matches you.'}
      </PageHeader>

      <FilterBar filters={filters} tags={tags} onChange={setFilters} />

      <div className="mt-8">
        {loading && !data ? (
          <Spinner label="Fetching destinations…" />
        ) : error ? (
          <ErrorBox error={error} onRetry={() => setFilters({ ...filters })} />
        ) : list.length === 0 ? (
          <Empty title="Nothing matched that" illustration="🗺">
            Try a broader search, or clear the filters. We're adding destinations as we go.
          </Empty>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone">
              {list.length} {list.length === 1 ? 'place' : 'places'}
              {filters.tag && <> tagged <span className="text-ink">{filters.tag}</span></>}
              {loading && <span className="ml-2 animate-pulse">updating…</span>}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => (
                <DestinationCard key={d._id} destination={d} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
