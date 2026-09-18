import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Compass, Menu, X, LogOut, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/authContext'

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
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

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
      <NavLink to="/dashboard" className={navClass} onClick={() => setOpen(false)}>Today</NavLink>
      <NavLink to="/explore" className={navClass} onClick={() => setOpen(false)}>Explore</NavLink>
      <NavLink to="/trips" className={navClass} onClick={() => setOpen(false)}>My trips</NavLink>
    </>
  ) : (
    <NavLink to="/explore" className={navClass} onClick={() => setOpen(false)}>Explore</NavLink>
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
                <Plus size={16} /> Plan a trip
              </Link>
              <Link to="/profile" className="ml-1 flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-cream" title="Your profile">
                <Avatar user={user} />
                <span className="text-sm text-soot">{user.name.split(' ')[0]}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost !px-2" title="Log out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary !py-1.5">Get started</Link>
            </>
          )}
        </div>

        <button className="btn-ghost !px-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
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
                  <Plus size={16} /> Plan a trip
                </Link>
                <Link to="/profile" className="btn-secondary" onClick={() => setOpen(false)}>
                  Profile & preferences
                </Link>
                <button onClick={handleLogout} className="btn-ghost">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary" onClick={() => setOpen(false)}>Log in</Link>
                <Link to="/register" className="btn-primary" onClick={() => setOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
