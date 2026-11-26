import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { externalApi } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'
import { BUDGET_LABEL, ErrorBox, INTERESTS, PACE_LABEL } from '../ui'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR']
const EURO_COUNTRIES = new Set(['austria', 'belgium', 'croatia', 'cyprus', 'estonia', 'finland', 'france', 'germany', 'greece', 'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 'netherlands', 'portugal', 'slovakia', 'slovenia', 'spain'])
const currencyForCountry = (country) => {
  const name = String(country || '').toLowerCase()
  if (name === 'india') return 'INR'
  if (name === 'united states' || name === 'united states of america') return 'USD'
  if (name === 'united kingdom') return 'GBP'
  if (name === 'japan') return 'JPY'
  if (name === 'australia') return 'AUD'
  if (name === 'canada') return 'CAD'
  if (EURO_COUNTRIES.has(name)) return 'EUR'
  return ''
}

export default function PreferencesForm({ user, onSave }) {
  const { t } = useLanguage()
  const [prefs, setPrefs] = useState({
    interests: user.preferences?.interests || [],
    budgetLevel: user.preferences?.budgetLevel || 'mid',
    travelPace: user.preferences?.travelPace || 'balanced',
    homeCity: user.preferences?.homeCity || '',
    homeCountry: user.preferences?.homeCountry || '',
    currency: user.preferences?.currency || 'INR',
  })
  const [state, setState] = useState({})
  const [homeSuggestions, setHomeSuggestions] = useState([])
  const [homeCityOpen, setHomeCityOpen] = useState(false)
  const [selectedHomeCity, setSelectedHomeCity] = useState('')
  const [currencyTouched, setCurrencyTouched] = useState(false)

  const set = (patch) => setPrefs((p) => ({ ...p, ...patch }))
  const toggle = (i) => set({ interests: prefs.interests.includes(i) ? prefs.interests.filter((x) => x !== i) : [...prefs.interests, i] })

  useEffect(() => {
    const query = prefs.homeCity.trim()
    if (!homeCityOpen || query.length < 2 || query === selectedHomeCity) {
      setHomeSuggestions([])
      return
    }

    const timer = window.setTimeout(() => {
      externalApi.geocode(query).then(setHomeSuggestions).catch(() => setHomeSuggestions([]))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [prefs.homeCity, homeCityOpen, selectedHomeCity])

  const chooseHomeCity = (place) => {
    const city = place.city || place.label.split(',')[0].trim()
    const currency = currencyForCountry(place.country)
    set({
      homeCity: city,
      homeCountry: place.country || '',
      ...(currency && !currencyTouched ? { currency } : {}),
    })
    setSelectedHomeCity(city)
    setHomeCityOpen(false)
    setHomeSuggestions([])
  }

  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true })
    try {
      let preferences = prefs
      if (prefs.homeCity.trim() && !prefs.homeCountry) {
        const matches = await externalApi.geocode(prefs.homeCity.trim()).catch(() => [])
        const place = matches[0]
        if (place?.country) {
          const currency = currencyForCountry(place.country)
          preferences = {
            ...prefs,
            homeCity: place.city || prefs.homeCity.trim(),
            homeCountry: place.country,
            currency: currency && !currencyTouched ? currency : prefs.currency,
          }
        }
      }
      await onSave({ preferences })
      setPrefs(preferences)
      setSelectedHomeCity(preferences.homeCity)
      setState({ ok: true })
      setTimeout(() => setState({}), 2500)
    } catch (err) {
      setState({ error: err.message })
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{t('Travel preferences')}</h2>
      <ErrorBox error={state.error} className="mt-3" />

      <div className="mt-5 space-y-6">
        <div>
          <p className="label">{t('Interests')}</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button type="button" key={interest} onClick={() => toggle(interest)} className={prefs.interests.includes(interest) ? 'chip-on' : 'chip-idle'}>{t(interest)}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label">{t('Budget style')}</p>
            <Segmented options={BUDGET_LABEL} value={prefs.budgetLevel} onChange={(v) => set({ budgetLevel: v })} />
          </div>
          <div>
            <p className="label">{t('Usual pace')}</p>
            <Segmented options={PACE_LABEL} value={prefs.travelPace} onChange={(v) => set({ travelPace: v })} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="homeCity">{t('Home city')} <span className="font-normal text-stone">{t('(optional)')}</span></label>
            <div className="relative">
              <input
                id="homeCity"
                className="input"
                value={prefs.homeCity}
                placeholder={t('Where you fly from')}
                autoComplete="off"
                role="combobox"
                aria-expanded={homeCityOpen}
                aria-controls="home-city-suggestions"
                aria-autocomplete="list"
                onFocus={() => setHomeCityOpen(true)}
                onChange={(e) => {
                  set({ homeCity: e.target.value, homeCountry: '' })
                  setSelectedHomeCity('')
                  setHomeCityOpen(true)
                }}
                onBlur={() => window.setTimeout(() => setHomeCityOpen(false), 100)}
              />
              {homeCityOpen && homeSuggestions.length > 0 && (
                <div id="home-city-suggestions" role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-sand bg-white p-1 shadow-soft">
                  {homeSuggestions.map((place) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      key={`${place.lat}-${place.lng}-${place.label}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseHomeCity(place)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream"
                    >
                      <span className="block font-medium">{place.city || place.label.split(',')[0]}</span>
                      <span className="block text-xs text-stone">{place.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-stone">{prefs.homeCountry ? t('Home country: {country}', { country: prefs.homeCountry }) : t('Choose a city suggestion or save to set its country and estimate currency.')}</p>
          </div>
          <div>
            <label className="label" htmlFor="currency">{t('Currency for budgets')}</label>
            <select id="currency" className="input" value={prefs.currency} onChange={(e) => { setCurrencyTouched(true); set({ currency: e.target.value }) }}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="mt-1 text-xs text-stone">{t('Budgets use destination costs and your selected currency; flights are entered manually.')}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {state.ok && <span className="text-sm text-moss-600">{t('Saved.')}</span>}
        <button type="submit" disabled={state.busy} className="btn-primary">{state.busy ? t('Saving…') : t('Save preferences')}</button>
      </div>
    </form>
  )
}

function Segmented({ options, value, onChange }) {
  const { t } = useLanguage()
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream p-1">
      {Object.entries(options).map(([key, label]) => (
        <button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          className={clsx('rounded-lg px-2 py-1.5 text-xs font-medium transition', value === key ? 'bg-white text-ink shadow-soft' : 'text-soot hover:text-ink')}
        >
          {t(label)}
        </button>
      ))}
    </div>
  )
}
