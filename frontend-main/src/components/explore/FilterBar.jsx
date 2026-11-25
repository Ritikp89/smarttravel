import { Search, X } from 'lucide-react'

const REGIONS = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Middle East']

export default function FilterBar({ filters, tags, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })
  const active = filters.q || filters.region || filters.tag

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone" />
          <input
            className="input !pl-10"
            placeholder="Search a city, country, or vibe - 'wine', 'temples', 'surf'…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <select className="input md:w-44" value={filters.region} onChange={(e) => set({ region: e.target.value })}>
          <option value="">Anywhere</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className="input md:w-44" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="popular">Most popular</option>
          <option value="rating">Highest rated</option>
          <option value="cheapest">Cheapest first</option>
          <option value="name">A to Z</option>
        </select>
        {active && (
          <button onClick={() => onChange({ q: '', region: '', tag: '', sort: filters.sort })} className="btn-ghost !px-3">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => set({ tag: filters.tag === t ? '' : t })}
              className={filters.tag === t ? 'chip-on shrink-0' : 'chip-idle shrink-0'}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
