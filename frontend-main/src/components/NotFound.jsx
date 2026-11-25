import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function NotFound() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-7xl font-light text-sand">404</p>
      <h1 className="mt-2 text-2xl font-semibold">{t("Well, this isn't on the map.")}</h1>
      <p className="mt-2 text-sm text-soot">{t("The page you were after doesn't exist, or it moved without telling us.")}</p>
      <Link to="/" className="btn-primary mt-6">{t('Back to the start')}</Link>
    </div>
  )
}
