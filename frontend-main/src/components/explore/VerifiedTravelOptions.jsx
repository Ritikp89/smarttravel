import { useState } from 'react'
import { ExternalLink, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { travelOptionApi } from '../../services/api'
import { ErrorBox, formatDate, Spinner } from '../ui'

const CATEGORIES = ['hotel', 'tour', 'transport']
const ACCESSIBILITY = [
  { key: 'wheelchairAccess', label: 'Wheelchair access' },
  { key: 'sensoryFriendly', label: 'Sensory-friendly' },
]
const DIETARY = [
  { key: 'halal', label: 'Halal' },
  { key: 'vegan', label: 'Vegan' },
]
const ALLERGENS = [
  { key: 'peanuts', label: 'peanuts' },
  { key: 'tree-nuts', label: 'Tree nuts' },
  { key: 'milk', label: 'milk' },
  { key: 'eggs', label: 'eggs' },
  { key: 'wheat', label: 'wheat' },
  { key: 'soy', label: 'soy' },
  { key: 'fish', label: 'fish' },
  { key: 'shellfish', label: 'shellfish' },
  { key: 'sesame', label: 'sesame' },
]

const emptyFilters = {
  category: CATEGORIES,
  accessibility: [],
  dietary: [],
  allergen: [],
}

export default function VerifiedTravelOptions() {
  const { t, locale } = useLanguage()
  const [filters, setFilters] = useState(emptyFilters)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggle = (group, value) => {
    setFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }))
  }

  const search = async (event) => {
    event.preventDefault()
    if (!filters.accessibility.length && !filters.dietary.length && !filters.allergen.length) {
      setError(t('Choose at least one accessibility or dietary requirement.'))
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      setResult(await travelOptionApi.verified({
        category: filters.category.join(','),
        accessibility: filters.accessibility.join(','),
        dietary: filters.dietary.join(','),
        allergen: filters.allergen.join(','),
      }))
    } catch (requestError) {
      setError(requestError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const externalSearchUrl = () => {
    const categories = CATEGORIES
      .filter((category) => filters.category.includes(category))
      .map((category) => t(category))
    const requirements = [
      ...ACCESSIBILITY
        .filter(({ key }) => filters.accessibility.includes(key))
        .map(({ label }) => t(label)),
      ...DIETARY
        .filter(({ key }) => filters.dietary.includes(key))
        .map(({ label }) => t(label)),
      ...ALLERGENS
        .filter(({ key }) => filters.allergen.includes(key))
        .map(({ label }) => t('Allergy-safe for {allergen}', { allergen: t(label) })),
    ]
    const query = [...categories, ...requirements].join(' ')
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`
  }

  const clear = () => {
    setFilters(emptyFilters)
    setResult(null)
    setError(null)
  }

  return (
    <section className="card mb-8 p-5 sm:p-6" aria-labelledby="verified-options-title">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck size={22} className="mt-1 shrink-0 text-moss-600" />
        <div>
          <h2 id="verified-options-title" className="text-xl font-semibold">{t('Verified access & dietary options')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-soot">{t('Find hotels, tours, and transport with staff-reviewed accessibility or dietary claims.')}</p>
        </div>
      </div>

      <form onSubmit={search}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <FilterGroup title="Option type">
            {CATEGORIES.map((category) => (
              <FilterCheckbox key={category} label={t(category)} checked={filters.category.includes(category)} onChange={() => toggle('category', category)} />
            ))}
          </FilterGroup>

          <FilterGroup title="Accessibility">
            {ACCESSIBILITY.map(({ key, label }) => (
              <FilterCheckbox key={key} label={t(label)} checked={filters.accessibility.includes(key)} onChange={() => toggle('accessibility', key)} />
            ))}
          </FilterGroup>

          <FilterGroup title="Dietary">
            {DIETARY.map(({ key, label }) => (
              <FilterCheckbox key={key} label={t(label)} checked={filters.dietary.includes(key)} onChange={() => toggle('dietary', key)} />
            ))}
          </FilterGroup>

          <FilterGroup title="Allergy-safe for">
            {ALLERGENS.map(({ key, label }) => (
              <FilterCheckbox key={key} label={t(label)} checked={filters.allergen.includes(key)} onChange={() => toggle('allergen', key)} />
            ))}
          </FilterGroup>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            <Search size={16} /> {t('Find verified options')}
          </button>
          <button type="button" className="btn-ghost" onClick={clear}>{t('Clear requirements')}</button>
          <p className="basis-full text-xs text-stone">{t('Every selected requirement must have staff-reviewed HTTPS evidence. Confirm current conditions and allergy cross-contact directly with the provider before booking.')}</p>
        </div>
      </form>

      {error && <ErrorBox error={error} className="mt-4" />}
      {loading && <Spinner label="Checking verified options…" className="py-8" />}
      {!loading && result && result.options.length === 0 && (
        <div className="mt-5 rounded-xl bg-cream px-4 py-3 text-sm text-soot">
          <p>{t('No listings currently have verified evidence for every selected requirement.')}</p>
          <a
            href={externalSearchUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-semibold text-clay-700 underline underline-offset-2"
          >
            <Search size={14} /> {t('Search these requirements on Google')} <ExternalLink size={12} />
          </a>
          <p className="mt-2 text-xs text-stone">
            {t('External search results are not verified by Smart Travel. Confirm accessibility, ingredients, and allergy cross-contact with the provider.')}
          </p>
        </div>
      )}
      {!loading && result?.options.length > 0 && (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {result.options.map((option) => (
            <li key={option._id} className="rounded-xl border border-sand p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">{t(option.category)}</p>
                  <h3 className="mt-1 font-semibold">{option.name}</h3>
                  <p className="text-sm text-soot">{option.provider} · {option.destination?.name}, {option.destination?.country}</p>
                </div>
                <ShieldCheck size={19} className="shrink-0 text-moss-600" aria-label={t('Staff verified')} />
              </div>
              {option.description && <p className="mt-2 text-sm text-soot">{option.description}</p>}
              <ul className="mt-3 space-y-2">
                {getVerifiedClaims(option.verification, t).map((claim) => (
                  <li key={`${claim.label}-${claim.evidenceUrl}`} className="flex flex-wrap items-center gap-x-2 text-xs text-moss-700">
                    <ShieldCheck size={13} />
                    <span>{claim.label}</span>
                    <span className="text-stone">{t('Reviewed {date}', { date: formatDate(claim.verifiedAt, 'PP', locale) })}</span>
                    <a href={claim.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                      {t('Evidence')} <ExternalLink size={11} />
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                {option.destination?.slug && <Link to={`/explore/${option.destination.slug}`} className="text-ink underline underline-offset-2">{t('Destination details')}</Link>}
                {option.bookingUrl && (
                  <a href={option.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-clay-700 underline underline-offset-2">
                    {t('Check with provider')} <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function getVerifiedClaims(verification, t) {
  const claims = []
  const accessibility = verification?.accessibility || {}
  const dietary = verification?.dietary || {}

  if (accessibility.wheelchairAccess) claims.push({ label: t('Wheelchair access'), ...accessibility.wheelchairAccess })
  if (accessibility.sensoryFriendly) claims.push({ label: t('Sensory-friendly'), ...accessibility.sensoryFriendly })
  if (dietary.halal) claims.push({ label: t('Halal'), ...dietary.halal })
  if (dietary.vegan) claims.push({ label: t('Vegan'), ...dietary.vegan })
  dietary.allergies?.forEach((claim) => {
    const allergen = claim.allergen === 'tree-nuts' ? 'Tree nuts' : claim.allergen
    claims.push({ label: t('Allergy-safe for {allergen}', { allergen: t(allergen) }), ...claim })
  })
  return claims
}

function FilterGroup({ title, children }) {
  const { t } = useLanguage()
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold">{t(title)}</legend>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">{children}</div>
    </fieldset>
  )
}

function FilterCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-soot">
      <input type="checkbox" className="mt-0.5 accent-moss-600" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}
