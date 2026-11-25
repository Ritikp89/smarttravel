import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { useLanguage } from '../../context/LanguageContext'
import { identityVerificationApi } from '../../services/api'
import { Avatar } from '../Navbar'
import PreferencesForm from './PreferencesForm'
import IdentityVerificationPanel from './IdentityVerificationPanel'
import { ErrorBox, formatDate, PageHeader } from '../ui'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { t, locale } = useLanguage()
  const { hash } = useLocation()
  const [verification, setVerification] = useState(null)
  const [verificationError, setVerificationError] = useState('')

  const loadVerification = useCallback(async () => {
    try {
      setVerification(await identityVerificationApi.status())
      setVerificationError('')
    } catch (err) {
      setVerificationError(err.message)
    }
  }, [])

  useEffect(() => {
    loadVerification()
  }, [loadVerification])

  useEffect(() => {
    if (hash === '#identity-verification') {
      document.getElementById('identity-verification')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Your profile" title="You, in travel terms">
        This is what shapes recommendations and the defaults for new trips.
      </PageHeader>

      <div className="card mb-6 flex items-center gap-4 p-5">
        <Avatar user={user} size="lg" />
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-soot">{user.email}</p>
          <p className="text-xs text-stone">{t('Planning with us since {date}', { date: formatDate(user.createdAt, 'MMMM yyyy', locale) })}</p>
        </div>
      </div>

      <div className="space-y-6">
        <IdentityVerificationPanel
          verification={verification}
          onRefresh={loadVerification}
          statusError={verificationError}
        />
        <PreferencesForm user={user} onSave={updateProfile} />
        <AccountForm user={user} onSave={updateProfile} />
      </div>
    </div>
  )
}

function AccountForm({ user, onSave }) {
  const { t } = useLanguage()
  const [name, setName] = useState(user.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState({})

  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true })
    try {
      const payload = { name: name.trim() }
      if (password) Object.assign(payload, { password, currentPassword })
      await onSave(payload)
      setPassword('')
      setCurrentPassword('')
      setState({ ok: true })
      setTimeout(() => setState({}), 2500)
    } catch (err) {
      setState({ error: err.message })
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{t('Account')}</h2>
      <ErrorBox error={state.error} className="mt-3" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">{t('Name')}</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="currentPassword">{t('Current password')}</label>
          <input id="currentPassword" type="password" autoComplete="current-password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('Only if changing it')} />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">{t('New password')}</label>
          <input id="newPassword" type="password" autoComplete="new-password" minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('Leave blank to keep')} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-3">
        {state.ok && <span className="text-sm text-moss-600">{t('Saved.')}</span>}
        <button type="submit" disabled={state.busy} className="btn-primary">{state.busy ? t('Saving…') : t('Save account')}</button>
      </div>
    </form>
  )
}
