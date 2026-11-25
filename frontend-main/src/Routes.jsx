import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/authContext'
import { useLanguage } from './context/LanguageContext'
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
import Chatbot from './components/Chatbot'
import GroupChat from './components/chat/GroupChat'
import GroupSplit from './components/trips/GroupSplit'
import PriceWatch from './components/trips/PriceWatch'
import SavingsPlan from './components/trips/SavingsPlan'
import OfflineTripPage from './components/trips/OfflineTripPage'
import Feedback from './components/Feedback'
import SoloTravelerMatching from './components/trips/SoloTravelerMatching'
import GlobalSearch from './components/GlobalSearch'
import { CreatorRoutes, CreatorRouteDetail, CreatorRouteEditor } from './components/creator/CreatorRoutes'

function Shell() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-sand/60 py-6 text-center text-xs text-stone">
        {t('Smart Travel · weather by Open-Meteo · maps by OpenStreetMap contributors')}
      </footer>
      <Chatbot />
      <Feedback />
    </div>
  )
}

function RequireAuth() {
  const { isAuthed, booting } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-stone">
        <span className="animate-pulse">{t('Checking your session…')}</span>
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
      <Route path="offline/trips/:id" element={<OfflineTripPage />} />
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/:slug" element={<DestinationDetail />} />
        <Route path="search" element={<GlobalSearch />} />
        <Route path="creator-routes" element={<CreatorRoutes />} />
        <Route path="creator-routes/:id" element={<CreatorRouteDetail />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginForm />} />
          <Route path="register" element={<RegisterForm />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trips" element={<TripList />} />
          <Route path="trips/new" element={<NewTrip />} />
          <Route path="trips/:id" element={<TripDetail />} />
          <Route path="trips/:id/split" element={<GroupSplit />} />
          <Route path="trips/:id/prices" element={<PriceWatch />} />
          <Route path="trips/:id/savings" element={<SavingsPlan />} />
          <Route path="solo-travelers" element={<SoloTravelerMatching />} />
          <Route path="chat" element={<GroupChat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="creator-routes/new" element={<CreatorRouteEditor />} />
          <Route path="creator-routes/:id/edit" element={<CreatorRouteEditor />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
