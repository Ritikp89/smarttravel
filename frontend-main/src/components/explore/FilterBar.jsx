import { Search, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const REGIONS = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Middle East']

export default function FilterBar({ filters, tags, onChange }) {
  const { t } = useLanguage()
  const set = (patch) => onChange({ ...filters, ...patch })
  const active = filters.q || filters.region || filters.tag

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone" />
          <input
            className="input !pl-10"
            placeholder={t("Search a city, country, or vibe - 'wine', 'temples', 'surf'…")}
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <select className="input md:w-44" value={filters.region} onChange={(e) => set({ region: e.target.value })}>
          <option value="">{t('Anywhere')}</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{t(r)}</option>
          ))}
        </select>
        <select className="input md:w-44" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="popular">{t('Most popular')}</option>
          <option value="rating">{t('Highest rated')}</option>
          <option value="cheapest">{t('Cheapest first')}</option>
          <option value="name">{t('A to Z')}</option>
        </select>
        {active && (
          <button onClick={() => onChange({ q: '', region: '', tag: '', sort: filters.sort })} className="btn-ghost !px-3">
            <X size={14} /> {t('Clear')}
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => set({ tag: filters.tag === tag ? '' : tag })}
              className={filters.tag === tag ? 'chip-on shrink-0' : 'chip-idle shrink-0'}
            >
              {t(tag)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
