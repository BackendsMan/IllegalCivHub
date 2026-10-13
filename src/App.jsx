import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './useAuth'
import Home from './pages/Home'
import Roe from './pages/Roe'
import Submit from './pages/Submit'
import TurfMap from './pages/TurfMap'
import Spin from './pages/Spin'
import Login from './pages/Login'
import Admin from './pages/Admin'

function RequireAdmin({ children }) {
  const user = useAuth()
  if (user === undefined) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const location = useLocation()
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/roe" element={<Roe />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/map" element={<TurfMap />} />
          <Route path="/spin" element={<Spin back />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </MotionConfig>
  )
}
