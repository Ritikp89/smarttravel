import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, TOKEN_KEY } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // true until we've checked whether a stored token is still valid
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    authApi
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setBooting(false))
  }, [])

  // the axios interceptor fires this when a 401 comes back
  useEffect(() => {
    const onForcedLogout = () => setUser(null)
    window.addEventListener('smart-travel:logout', onForcedLogout)
    return () => window.removeEventListener('smart-travel:logout', onForcedLogout)
  }, [])

  const login = useCallback(async (email, password) => {
    const { token, user } = await authApi.login({ email, password })
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
    return user
  }, [])

  const register = useCallback(async (payload) => {
    const { token, user } = await authApi.register(payload)
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const updated = await authApi.update(payload)
    setUser(updated)
    return updated
  }, [])

  const toggleSaved = useCallback(async (destinationId) => {
    const { saved, savedDestinations } = await authApi.toggleSaved(destinationId)
    setUser((u) => (u ? { ...u, savedDestinations } : u))
    return saved
  }, [])

  const isSaved = useCallback(
    (destinationId) =>
      Boolean(user?.savedDestinations?.some((d) => (d._id || d) === destinationId)),
    [user]
  )

  const value = useMemo(
    () => ({ user, booting, isAuthed: Boolean(user), login, register, logout, updateProfile, toggleSaved, isSaved, setUser }),
    [user, booting, login, register, logout, updateProfile, toggleSaved, isSaved]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
