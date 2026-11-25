import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { identityVerificationApi } from '../../services/api'
import { ErrorBox } from '../ui'

const AGE_LABELS = {
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45+': '45+',
}

export default function IdentityVerificationPanel({ verification, onRefresh, statusError }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const startUpload = async () => {
    if (!verification?.configured) {
      setError('Stripe Identity must be configured by the service administrator before document upload is available.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const session = await identityVerificationApi.createSession()
      if (session.url) {
        window.location.assign(session.url)
        return
      }
      await onRefresh?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const statusText = !verification
    ? t('Loading verification status…')
    : verification.status === 'verified' && verification.eligible
      ? verification.ageBand
        ? t('Verified · age {age}', { age: AGE_LABELS[verification.ageBand] || verification.ageBand })
        : t('Verified')
      : verification.status === 'verified'
        ? t('Identity verified, but an adult age band could not be confirmed. Matching is unavailable.')
        : verification.status === 'processing'
          ? t('Your verification is processing. Refresh to check again.')
          : verification.status === 'pending' || verification.status === 'creating'
            ? t('Verification is in progress. Refresh after completing Stripe’s steps.')
            : verification.status === 'requires_input'
              ? t('Stripe needs more information to complete verification.')
              : verification.status === 'canceled'
                ? t('Your previous verification attempt was canceled. You can start again.')
                : t('Verify your ID to enable matching.')

  return (
    <section id="identity-verification" className="card scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 shrink-0 text-moss-700" size={22} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{t('Adult ID verification')}</h2>
          <p className="mt-1 text-sm text-soot">
            {t('Upload your document through Stripe’s secure verification page. Smart Travel stores your verification status and broad age band, not your ID image or date of birth.')}
          </p>
          <p className="mt-2 text-sm">{statusText}</p>
          <ErrorBox error={statusError || error} className="mt-3" />
          {verification && verification.status !== 'verified' && (
            <button
              type="button"
              onClick={startUpload}
              disabled={busy}
              className="btn-primary mt-4"
            >
              <ShieldCheck size={16} />
              {busy ? t('Opening secure upload…') : verification?.status === 'requires_input' ? t('Continue ID upload') : t('Upload ID document')}
            </button>
          )}
          {verification && !verification.configured && (
            <p className="mt-2 text-xs text-stone">
              {t('Stripe Identity must be configured by the service administrator before document upload is available.')}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
