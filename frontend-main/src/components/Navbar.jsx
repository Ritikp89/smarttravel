import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Compass, Menu, X, LogOut, Plus, Search } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/authContext'
import { useLanguage } from '../context/LanguageContext'

const navClass = ({ isActive }) =>
  clsx(
    'rounded-full px-3 py-1.5 text-sm transition',
    isActive ? 'bg-ink text-paper' : 'text-soot hover:bg-cream hover:text-ink'
  )

function Avatar({ user, size = 'sm' }) {
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-semibold text-paper',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-14 w-14 text-lg'
      )}
      style={{ backgroundColor: user.avatarColor || '#c9532a' }}
    >
      {initials}
    </span>
  )
}

export { Avatar }

export default function Navbar() {
  const { user, isAuthed, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const myTripsNavClass = ({ isActive }) =>
    navClass({ isActive: isActive && pathname !== '/trips/new' })

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  const links = isAuthed ? (
    <>
      <NavLink to="/dashboard" className={navClass} onClick={() => setOpen(false)}>{t('Home')}</NavLink>
      <NavLink to="/explore" className={navClass} onClick={() => setOpen(false)}>{t('Explore')}</NavLink>
      <NavLink to="/search" className={navClass} onClick={() => setOpen(false)}><Search size={14} className="mr-1 inline" />{t('Search')}</NavLink>
      <NavLink to="/creator-routes" className={navClass} onClick={() => setOpen(false)}>{t('Creator routes')}</NavLink>
      <NavLink to="/trips" className={myTripsNavClass} onClick={() => setOpen(false)}>{t('My trips')}</NavLink>
      <NavLink to="/chat" className={navClass} onClick={() => setOpen(false)}>{t('Group chat')}</NavLink>
      <NavLink to="/solo-travelers" className={navClass} onClick={() => setOpen(false)}>{t('Travel buddies')}</NavLink>
    </>
  ) : (
    <>
      <NavLink to="/" className={navClass} onClick={() => setOpen(false)}>{t('Home')}</NavLink>
      <NavLink to="/explore" className={navClass} onClick={() => setOpen(false)}>{t('Explore')}</NavLink>
      <NavLink to="/search" className={navClass} onClick={() => setOpen(false)}><Search size={14} className="mr-1 inline" />{t('Search')}</NavLink>
      <NavLink to="/creator-routes" className={navClass} onClick={() => setOpen(false)}>{t('Creator routes')}</NavLink>
      <NavLink to="/trips/new" className={navClass} onClick={() => setOpen(false)}>{t('Plan a trip')}</NavLink>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-sand/60 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to={isAuthed ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper">
            <Compass size={18} strokeWidth={2.2} />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Smart Travel</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthed ? (
            <>
              <Link to="/trips/new" className="btn-primary !py-1.5">
                <Plus size={16} /> {t('Plan a trip')}
              </Link>
              <Link to="/profile" className="ml-1 flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-cream" title={t('Your profile')}>
                <Avatar user={user} />
                <span className="text-sm text-soot">{user.name.split(' ')[0]}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost !px-2" title={t('Log out')}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">{t('Log in')}</Link>
              <Link to="/register" className="btn-primary !py-1.5">{t('Get started')}</Link>
            </>
          )}
          <label className="ml-1">
            <span className="sr-only">{t('Language')}</span>
            <select className="rounded-full border border-sand bg-paper px-2 py-1.5 text-xs" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Language')}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
        </div>

        <button className="btn-ghost !px-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={t('Menu')}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-sand/60 bg-paper px-4 py-3 md:hidden animate-rise">
          <nav className="flex flex-col gap-1">{links}</nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-sand/60 pt-3">
            {isAuthed ? (
              <>
                <Link to="/trips/new" className="btn-primary" onClick={() => setOpen(false)}>
                  <Plus size={16} /> {t('Plan a trip')}
                </Link>
                <Link to="/profile" className="btn-secondary" onClick={() => setOpen(false)}>{t('Profile & preferences')}</Link>
                <button onClick={handleLogout} className="btn-ghost">{t('Log out')}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary" onClick={() => setOpen(false)}>{t('Log in')}</Link>
                <Link to="/register" className="btn-primary" onClick={() => setOpen(false)}>{t('Get started')}</Link>
              </>
            )}
            <label>
              <span className="label">{t('Language')}</span>
              <select className="input" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Language')}>
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </header>
  )
}
