import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/authContext'
import Navbar from './components/Navbar'
import Home from './components/Home'
import LoginForm from './components/auth/LoginForm'
import RegisterForm from './components/auth/RegisterForm'
import Dashboard from './components/dashboard/Dashboard'
import Explore from './components/explore/Explore'
import DestinationDetail from './components/explore/DestinationDetail'
import TripList from './components/trips/TripList'
import NewTrip from './components/trips/NewTrip'
import TripDetail from './components/trips/TripDetail'
import Profile from './components/user/Profile'
import NotFound from './components/NotFound'

function Shell() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-sand/60 py-6 text-center text-xs text-stone">
        Smart Travel &middot; weather by Open-Meteo &middot; maps by OpenStreetMap contributors
      </footer>
    </div>
  )
}

function RequireAuth() {
  const { isAuthed, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-stone">
        <span className="animate-pulse">Checking your session…</span>
      </div>
    )
  }
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Logged-in users shouldn't see the login page again
function GuestOnly() {
  const { isAuthed, booting } = useAuth()
  if (booting) return null
  return isAuthed ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/:slug" element={<DestinationDetail />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginForm />} />
          <Route path="register" element={<RegisterForm />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trips" element={<TripList />} />
          <Route path="trips/new" element={<NewTrip />} />
          <Route path="trips/:id" element={<TripDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
