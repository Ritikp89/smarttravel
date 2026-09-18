import { useState } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../../context/authContext'
import { Avatar } from '../Navbar'
import PreferencesForm from './PreferencesForm'
import { ErrorBox, PageHeader } from '../ui'

export default function Profile() {
  const { user, updateProfile } = useAuth()

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
          <p className="text-xs text-stone">Planning with us since {format(new Date(user.createdAt), 'MMMM yyyy')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <PreferencesForm user={user} onSave={updateProfile} />
        <AccountForm user={user} onSave={updateProfile} />
      </div>
    </div>
  )
}

function AccountForm({ user, onSave }) {
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
      <h2 className="text-xl font-semibold">Account</h2>
      <ErrorBox error={state.error} className="mt-3" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" autoComplete="current-password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Only if changing it" />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" autoComplete="new-password" minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-3">
        {state.ok && <span className="text-sm text-moss-600">Saved.</span>}
        <button type="submit" disabled={state.busy} className="btn-primary">{state.busy ? 'Saving…' : 'Save account'}</button>
      </div>
    </form>
  )
}
