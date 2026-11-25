import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/authContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import AppRoutes from './Routes.jsx'
import './index.css'

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js')
    .catch((error) => console.error('Offline app shell registration failed:', error))
}
if (document.readyState === 'complete') registerServiceWorker()
else window.addEventListener('load', registerServiceWorker, { once: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
)
